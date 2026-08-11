const HAPTICS_KEY = 'nihongo-haptics-v1'

let enabled = true
let ctx = null

try {
  enabled = localStorage.getItem(HAPTICS_KEY) !== 'false'
} catch {
  // ignore
}

export function setHapticsEnabled(v) {
  enabled = !!v
  try {
    localStorage.setItem(HAPTICS_KEY, String(enabled))
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('haptics-changed', { detail: { enabled } }))
  }
}

export function hapticsEnabled() {
  return enabled
}

function vibrationAvailable() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

function isIOS() {
  return (
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.MSStream
  )
}

function getCtx() {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function blip(freq, duration, volume) {
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function iOSFallback(kind) {
  if (kind === 'success') {
    blip(740, 0.09, 0.05)
    blip(980, 0.1, 0.05, 0.07)
  } else if (kind === 'warning') {
    blip(330, 0.12, 0.06)
  } else {
    blip(1000, 0.045, 0.05)
  }
}

export function tap() {
  if (!enabled) return
  if (vibrationAvailable()) {
    try {
      navigator.vibrate(8)
    } catch {
      // ignore
    }
    return
  }
  if (isIOS()) iOSFallback('tap')
}

export function success() {
  if (!enabled) return
  if (vibrationAvailable()) {
    try {
      navigator.vibrate([15, 40, 15])
    } catch {
      // ignore
    }
    return
  }
  if (isIOS()) iOSFallback('success')
}

export function warning() {
  if (!enabled) return
  if (vibrationAvailable()) {
    try {
      navigator.vibrate([30, 50, 30])
    } catch {
      // ignore
    }
    return
  }
  if (isIOS()) iOSFallback('warning')
}
