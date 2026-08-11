import { createContext, useCallback, useContext, useState } from 'react'
import {
  clearSession,
  fetchSync,
  loadSavedUser,
  loadToken,
  login as apiLogin,
  pushSync,
  register as apiRegister,
  saveSession,
} from '../utils/auth.js'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

/** 合并本地与云端状态。策略：记录（history）取数量多的一方，其余字段云端优先。 */
export function mergeCloudState(localState, cloudState) {
  const cloud = cloudState || {}
  const merged = { ...localState, ...cloud }
  const localHistory = Array.isArray(localState.history) ? localState.history : []
  const cloudHistory = Array.isArray(cloud.history) ? cloud.history : []
  merged.history = localHistory.length >= cloudHistory.length ? localHistory : cloudHistory
  return merged
}

export function AuthProvider({ children, onSessionChange }) {
  const [user, setUser] = useState(() => {
    const saved = loadSavedUser()
    return saved && loadToken() ? saved : null
  })

  const applyRemote = useCallback(() => {
    if (!loadToken()) return null
    return fetchSync()
      .then((res) => {
        const cloud = JSON.parse(res.data || '{}')
        return cloud
      })
      .catch(() => null)
  }, [])

  const pushLocal = useCallback((localState) => {
    if (!loadToken()) return Promise.resolve()
    return pushSync(JSON.stringify(localState)).catch(() => {})
  }, [])

  const setSession = useCallback(
    (token, username) => {
      saveSession(token, username)
      setUser({ username })
      if (onSessionChange) onSessionChange({ token, username })
    },
    [onSessionChange],
  )

  const login = useCallback(
    async (username, password) => {
      const res = await apiLogin(username, password)
      setSession(res.token, res.username)
      return res
    },
    [setSession],
  )

  const register = useCallback(
    async (username, password) => {
      const res = await apiRegister(username, password)
      setSession(res.token, res.username)
      return res
    },
    [setSession],
  )

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    if (onSessionChange) onSessionChange(null)
  }, [onSessionChange])

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        applyRemote,
        pushLocal,
        setSession,
        synchronize: applyRemote,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}