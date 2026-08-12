const PROD_API = 'https://java-employee-intro.onrender.com'
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? PROD_API : 'http://localhost:8080')
const TOKEN_KEY = 'langstudy-auth-token-v1'
const USER_KEY = 'langstudy-auth-user-v1'

export function getApiBase() {
  return API_BASE
}

export function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function loadSavedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(token, username) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify({ username }))
  } catch {
    // ignore
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // ignore
  }
}

const DEFAULT_TIMEOUT_MS = 60000

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function api(path, options = {}, attempt = 0) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = loadToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal })
  } catch (err) {
    clearTimeout(timer)
    if (err && err.name === 'AbortError') {
      throw new Error('服务器响应超时。免费云端实例若在冷启动，通常需 30–60 秒，请稍后再试。')
    }
    throw new Error('无法连接服务器，请检查网络后重试')
  }
  clearTimeout(timer)
  if ((res.status === 502 || res.status === 503) && attempt < 2) {
    // onrender 免费实例冷启动期间可能短暂返回网关错误，稍等后重试
    await delay(4000)
    return api(path, options, attempt + 1)
  }
  if (res.status === 401) {
    clearSession()
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `请求失败 (${res.status})`)
  }
  return res.json()
}

export function register(username, password) {
  return api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function login(username, password) {
  return api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function fetchSync() {
  return api('/api/sync')
}

export function pushSync(data) {
  return api('/api/sync', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}