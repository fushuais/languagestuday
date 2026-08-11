import { createContext, useCallback, useContext, useRef, useState } from 'react'
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

/**
 * 权威合并函数：跨设备同步时把云端状态与本地状态合一。
 * - history：按 id 合并去重（不回退任何一端记录），按日期倒序
 * - 对象字段：本地与云端并集，云端优先
 * - 标量字段：博取两项「最近一次同步时间」较新的一侧（无 syncedAt 时云端优先）
 */
export function mergeCloudState(localState, cloudState, now = Date.now()) {
  const local = localState || {}
  const cloud = cloudState || {}
  const merged = {}

  const localHistory = Array.isArray(local.history) ? local.history : []
  const cloudHistory = Array.isArray(cloud.history) ? cloud.history : []
  const byId = new Map()
  ;[...localHistory, ...cloudHistory].forEach((r) => {
    if (r && r.id) byId.set(r.id, { ...(byId.get(r.id) || {}), ...r })
  })
  merged.history = [...byId.values()].sort((a, b) => new Date(b.date) - new Date(a.date))

  merged.profile = { ...(local.profile || {}), ...(cloud.profile || {}) }
  merged.overrides = { ...(local.overrides || {}), ...(cloud.overrides || {}) }
  merged.topicStates = { ...(local.topicStates || {}), ...(cloud.topicStates || {}) }
  merged.learnedWords = { ...(local.learnedWords || {}), ...(cloud.learnedWords || {}) }

  const lsrc = local.syncedAt
  const csyn = cloud.syncedAt
  const pick = (key, fallbackLocal, fallbackCloud) => {
    if (typeof csyn === 'number' && typeof lsrc === 'number') {
      return csyn >= lsrc ? cloud[key] ?? local[key] : local[key] ?? cloud[key]
    }
    return cloud[key] === undefined || cloud[key] === null ? local[key] ?? fallbackCloud : cloud[key]
  }
  merged.theme = pick('theme', local.theme, cloud.theme) ?? merged.theme ?? 'dark'
  merged.lang = pick('lang', local.lang, cloud.lang) ?? merged.lang ?? 'ja'
  merged.speechPrefs = { ...(local.speechPrefs || {}), ...(cloud.speechPrefs || {}) }
  merged.sound = pick('sound', local.sound, cloud.sound)
  merged.haptics = pick('haptics', local.haptics, cloud.haptics)
  merged.goal = pick('goal', local.goal, cloud.goal)

  merged.syncedAt = now
  return merged
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = loadSavedUser()
    return saved && loadToken() ? saved : null
  })
  const [syncStatus, setSyncStatus] = useState('idle')
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const syncedOnceRef = useRef(false)

  const applyRemote = useCallback(async () => {
    if (!loadToken()) return null
    setSyncStatus('syncing')
    try {
      const res = await fetchSync()
      const cloud = JSON.parse(res.data || '{}')
      syncedOnceRef.current = true
      setSyncStatus('ok')
      setLastSyncAt(Date.now())
      return cloud
    } catch (e) {
      setSyncStatus('error')
      throw e
    }
  }, [])

  const pushLocal = useCallback(
    (localState) => {
      if (!loadToken()) return Promise.resolve()
      // 首次拉取尚未成功（例如冷启动网络超时）时不阻塞后续推送，仅跳过开门前那次，
      // 避免本地旧数据反向覆盖云端；拉取失败后允许继续推送保证本地数据不丢。
      if (!syncedOnceRef.current && syncStatus !== 'error') {
        setSyncStatus('idle')
        return Promise.resolve()
      }
      setSyncStatus('syncing')
      return pushSync(JSON.stringify({ ...localState, syncedAt: Date.now() }))
        .then(() => {
          setSyncStatus('ok')
          setLastSyncAt(Date.now())
        })
        .catch((e) => {
          setSyncStatus('error')
          throw e
        })
    },
    [syncStatus],
  )

  const setSession = useCallback((token, username) => {
    saveSession(token, username)
    setUser({ username })
    syncedOnceRef.current = false
    setSyncStatus('idle')
  }, [])

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
    syncedOnceRef.current = false
    setSyncStatus('idle')
    setLastSyncAt(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        syncStatus,
        lastSyncAt,
        login,
        register,
        logout,
        applyRemote,
        pushLocal,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}