let ctx = null

const SOUND_KEY = 'nihongo-sound-v1'

let enabled = true

try {
  enabled = localStorage.getItem(SOUND_KEY) !== 'false'
} catch {
  // ignore
}

export function setSoundEnabled(v) {
  enabled = !!v
  try {
    localStorage.setItem(SOUND_KEY, String(enabled))
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sound-changed', { detail: { enabled } }))
  }
}

export function soundEnabledValue() {
  return enabled
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

export function playTone(freq, duration = 0.12, type = 'sine', volume = 0.15, delay = 0) {
  if (!enabled) return
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

export function playStart() {
  playTone(660, 0.1, 'triangle', 0.12)
  playTone(880, 0.12, 'triangle', 0.12, 0.12)
}

export function playFinish() {
  playTone(523, 0.15, 'triangle', 0.14)
  playTone(659, 0.15, 'triangle', 0.14, 0.14)
  playTone(784, 0.3, 'triangle', 0.16, 0.28)
}

export function playTick() {
  playTone(1200, 0.05, 'sine', 0.05)
}

export function playCount() {
  playTone(440, 0.06, 'square', 0.08)
}
