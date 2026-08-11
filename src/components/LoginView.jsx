import { useState } from 'react'
import { getApiBase } from '../utils/auth.js'
import { useAuth } from '../context/auth.jsx'
import { tap } from '../utils/haptics.js'

function isIOS() {
  return (
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.MSStream
  )
}

export default function LoginView({ onClose }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    if (mode === 'register' && password.length < 4) {
      setError('密码至少 4 位')
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(username.trim(), password)
      } else {
        await register(username.trim(), password)
      }
      tap()
      onClose()
    } catch (err) {
      setError(err.message || '操作失败，请稍后再试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="settings-card login-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <div className="settings-title">账号 · 云同步</div>
          <button className="settings-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="login-hint">
          {isIOS()
            ? '登录后练习记录、进度可在多设备同步。也可以暂不登录，先以游客身份使用。'
            : '登录后练习记录、进度可在多设备同步。也可以直接关闭窗口，以游客身份使用，数据保存在本机。'}
        </div>

        <div className="settings-seg login-seg">
          <button
            className={`seg-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login')
              setError('')
            }}
          >
            登录
          </button>
          <button
            className={`seg-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            注册
          </button>
        </div>

        <form onSubmit={submit} className="login-form">
          <label className="login-label">
            <span>用户名</span>
            <input
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="字母、数字组合"
              autoComplete="username"
            />
          </label>
          <label className="login-label">
            <span>密码</span>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '至少 4 位' : '请输入密码'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>
          {mode === 'register' && (
            <label className="login-label">
              <span>确认密码</span>
              <input
                className="login-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </label>
          )}

          {error && <div className="login-error">{error}</div>}

          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? '请稍候…' : mode === 'login' ? '登录并同步' : '创建账号'}
          </button>
        </form>

        <div className="login-api">
          服务地址：{getApiBase()}
        </div>
      </div>
    </div>
  )
}