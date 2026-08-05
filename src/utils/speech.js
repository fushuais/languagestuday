import { loadSpeechPrefs, saveSpeechPrefs } from './storage.js'

let cachedVoices = []
let initStarted = false
let activeAudio = null

const edgeSettings = { enabled: true, ...loadSpeechPrefs() }
let edgeChecked = null
let seqToken = 0
let probing = false
let currentLang = 'ja'

export const DEFAULT_VOICE_JA = 'ja-JP-NanamiNeural'
export const DEFAULT_VOICE_EN = 'en-US-AriaNeural'

export const EDGE_VOICES_JA = [
  { id: 'ja-JP-NanamiNeural', label: 'Nanami · 女/标准' },
  { id: 'ja-JP-AoiNeural', label: 'Aoi · 女/柔和' },
  { id: 'ja-JP-ShioriNeural', label: 'Shiori · 女' },
  { id: 'ja-JP-MayuNeural', label: 'Mayu · 女' },
  { id: 'ja-JP-KeitaNeural', label: 'Keita · 男' },
  { id: 'ja-JP-DaichiNeural', label: 'Daichi · 男' },
  { id: 'ja-JP-TakumiNeural', label: 'Takumi · 男' },
]

export const EDGE_VOICES_EN = [
  { id: 'en-US-AriaNeural', label: 'Aria · 女/美式' },
  { id: 'en-US-JennyNeural', label: 'Jenny · 女/美式' },
  { id: 'en-US-GuyNeural', label: 'Guy · 男/美式' },
  { id: 'en-US-ChristopherNeural', label: 'Christopher · 男/美式' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia · 女/英式' },
  { id: 'en-AU-NatashaNeural', label: 'Natasha · 女/澳式' },
]

export function edgeVoiceForLang(lang) {
  const v = edgeSettings.voice
  const match = lang === 'en' ? /^en-/.test(v) : /^ja-/.test(v)
  return match ? v : lang === 'en' ? DEFAULT_VOICE_EN : DEFAULT_VOICE_JA
}

export function setSpeechLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'ja'
}

function emitEdgeStatus() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('edge-status-changed', { detail: edgeStatus() }))
}

export function edgeStatus() {
  return edgeChecked === false ? 'fallback' : edgeChecked === true ? 'ok' : 'unknown'
}

export function checkEdgeAvailability() {
  if (probing || typeof window === 'undefined') return Promise.resolve(edgeStatus())
  probing = true
  return fetch('/api/tts?probe=1', { cache: 'no-store' })
    .then((res) => res.json().catch(() => null))
    .then((data) => {
      edgeChecked = data?.ok === true
      return edgeChecked
    })
    .catch(() => {
      edgeChecked = false
      return false
    })
    .finally(() => {
      probing = false
      emitEdgeStatus()
    })
}

export function subscribeEdgeStatus(cb) {
  const listener = () => cb(edgeStatus())
  window.addEventListener('edge-status-changed', listener)
  return () => window.removeEventListener('edge-status-changed', listener)
}

export function initVoices() {
  if (initStarted || typeof window === 'undefined') return
  if (!('speechSynthesis' in window)) return
  initStarted = true
  const load = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
  load()
  window.speechSynthesis.addEventListener('voiceschanged', load)
}

function getVoice(lang) {
  const l = lang === 'en' ? 'en' : 'ja'
  return cachedVoices.find((v) => v.lang.toLowerCase().startsWith(l)) ?? null
}

export function speechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getSpeechPrefs() {
  return { ...edgeSettings }
}

export function setSpeechPrefs(prefs) {
  Object.assign(edgeSettings, prefs)
  saveSpeechPrefs(edgeSettings)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('speech-prefs-changed', { detail: { ...edgeSettings } }))
  }
}

export function isEdgeFallback() {
  return edgeChecked === false
}

export function edgeEnabled() {
  return edgeSettings.enabled && edgeChecked !== false
}

async function edgeSpeak(text, rate, onEnd) {
  const ratePct = Math.round((rate - 1) * 100)
  const voice = edgeVoiceForLang(currentLang)
  const res = await fetch(
    `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${ratePct}`,
  )
  if (!res.ok) throw new Error('edge tts failed')
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const audio = new Audio(urlObj)
  activeAudio = audio
  const cleanup = () => {
    URL.revokeObjectURL(urlObj)
    if (activeAudio === audio) activeAudio = null
    onEnd?.()
  }
  audio.onended = cleanup
  audio.onerror = cleanup
  try {
    await audio.play()
  } catch (e) {
    audio.onended = null
    audio.onerror = null
    URL.revokeObjectURL(urlObj)
    if (activeAudio === audio) activeAudio = null
    throw e
  }
  return 'edge'
}

export async function speakTextAsync(text, { rate = 1, onEnd } = {}) {
  stopSpeech()
  if (edgeSettings.enabled && edgeChecked !== false) {
    try {
      const engine = await edgeSpeak(text, rate, onEnd)
      edgeChecked = true
      return engine
    } catch {
      edgeChecked = false
    }
  }
  const ok = speakText(text, { rate, onEnd })
  return ok ? 'web' : 'none'
}

export function speakTextWait(text, { rate = 1, onEnd } = {}) {
  return new Promise((resolve) => {
    let settled = false
    const done = (engine) => {
      if (settled) return
      settled = true
      onEnd?.()
      resolve(engine)
    }
    const fallback = () => {
      const ok = speakText(text, { rate, onEnd: () => done('web') })
      if (!ok) done('none')
    }
    if (edgeSettings.enabled && edgeChecked !== false) {
      edgeSpeak(text, rate, () => done('edge'))
        .catch(() => {
          edgeChecked = false
          fallback()
        })
    } else {
      fallback()
    }
  })
}

export async function speakSequence(texts, { rate = 1, onProgress, onEnd } = {}) {
  const token = ++seqToken
  stopSpeech()
  const list = texts.filter(Boolean)
  for (let i = 0; i < list.length; i++) {
    if (token !== seqToken) return
    onProgress?.(i, list.length)
    const engine = await speakTextWait(list[i], { rate })
    if (engine === 'none') break
    if (token !== seqToken) return
  }
  if (token === seqToken) onEnd?.()
}

export function cancelSequence() {
  seqToken += 1
  stopSpeech()
}

export function speakText(text, { rate = 1, onEnd } = {}) {
  if (!speechAvailable()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = currentLang === 'en' ? 'en-US' : 'ja-JP'
  const voice = getVoice(currentLang)
  if (voice) u.voice = voice
  u.rate = rate
  u.pitch = 1
  const done = () => {
    onEnd?.()
    u.onend = null
    u.onerror = null
  }
  u.onend = done
  u.onerror = done
  synth.speak(u)
  return true
}

export function stopSpeech() {
  if (activeAudio) {
    try {
      activeAudio.pause()
    } catch {
      // ignore
    }
    activeAudio = null
  }
  if (speechAvailable()) window.speechSynthesis.cancel()
}

export function readingOf(kw) {
  const m = kw.match(/（([^）]+)）/)
  return m ? m[1] : kw
}

export function plainText(s) {
  return String(s).replace(/（[^）]*）/g, '')
}
