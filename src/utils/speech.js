import { loadSpeechPrefs, saveSpeechPrefs } from './storage.js'

let cachedVoices = []
let initStarted = false
let activeAudio = null

const edgeSettings = { enabled: true, ...loadSpeechPrefs() }
let edgeChecked = null
let seqToken = 0
let probing = false
let currentLang = 'ja'
let activeEdgeToken = 0

const EDGE_TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const EDGE_SEC_MS_GEC_VERSION = '1-143.0.3650.75'
const EDGE_OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3'
const EDGE_TIMEOUT_MS = 10000

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
  return edgeProbeBrowser()
    .then((ok) => {
      if (ok) return true
      return fetch('/api/tts?probe=1', { cache: 'no-store' })
        .then((res) => res.json().catch(() => null))
        .then((data) => data?.ok === true)
    })
    .then((ok) => {
      edgeChecked = ok
      return ok
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

function isEdgeBrowser() {
  return typeof navigator !== 'undefined' && /Edg\//i.test(navigator.userAgent)
}

function shouldTryEdge() {
  return edgeSettings.enabled && edgeChecked !== false && isEdgeBrowser()
}

function edgeConnId() {
  return (crypto.randomUUID?.() ?? 'xxxxxxxxxxxxxxxx').replace(/-/g, '')
}

async function edgeSecMsGec() {
  const ticks = Math.floor(Date.now() / 1000) + 11644473600
  const rounded = ticks - (ticks % 300)
  const windowsTicks = rounded * 10000000
  const data = new TextEncoder().encode(String(windowsTicks) + EDGE_TRUSTED_CLIENT_TOKEN)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

async function edgeBuildUrl() {
  const gec = await edgeSecMsGec()
  return (
    'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1' +
    `?TrustedClientToken=${EDGE_TRUSTED_CLIENT_TOKEN}` +
    `&ConnectionId=${edgeConnId()}` +
    `&Sec-MS-GEC=${gec}` +
    `&Sec-MS-GEC-Version=${EDGE_SEC_MS_GEC_VERSION}`
  )
}

function edgeDateToString() {
  const d = new Date()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${dd} ${d.getUTCFullYear()} ${hh}:${mm}:${ss} GMT+0000 (Coordinated Universal Time)`
}

function edgeConfigFrame(timestamp) {
  return (
    `X-Timestamp:${timestamp}\r\n` +
    'Content-Type:application/json; charset=utf-8\r\n' +
    'Path:speech.config\r\n\r\n' +
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: 'false',
              wordBoundaryEnabled: 'true',
            },
            outputFormat: EDGE_OUTPUT_FORMAT,
          },
        },
      },
    }) +
    '\r\n'
  )
}

function edgeEscapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function edgeSsmlFrame(text, voice, ratePct) {
  const xmlLang = /^en-/.test(voice) ? 'en-US' : 'ja-JP'
  const mssml =
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${xmlLang}'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='+0Hz' rate='${ratePct}%' volume='+0%'>` +
    `${edgeEscapeXml(text)}</prosody></voice></speak>`
  return (
    `X-RequestId:${edgeConnId()}\r\n` +
    'Content-Type:application/ssml+xml\r\n' +
    `X-Timestamp:${edgeDateToString()}Z\r\n` +
    'Path:ssml\r\n\r\n' +
    mssml
  )
}

function edgeConnect(url) {
  return new Promise((resolve, reject) => {
    let ws
    try {
      ws = new WebSocket(url)
    } catch (e) {
      reject(e)
      return
    }
    ws.binaryType = 'arraybuffer'
    ws.onopen = () => resolve(ws)
    ws.onerror = () => reject(new Error('ws connect error'))
    ws.onclose = () => reject(new Error('ws closed'))
  })
}

async function edgeSynthesizeBrowser(text, voice, ratePct) {
  const url = await edgeBuildUrl()
  const ws = await edgeConnect(url)
  return new Promise((resolve, reject) => {
    const chunks = []
    let settled = false
    const timer = setTimeout(() => done(new Error('edge tts timeout')), EDGE_TIMEOUT_MS)
    function done(err) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {
        // ignore
      }
      if (err) reject(err)
      else resolve(new Blob(chunks, { type: 'audio/mpeg' }))
    }
    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        if (ev.data.includes('Path:turn.end')) done()
        return
      }
      const view = new DataView(ev.data)
      if (view.byteLength < 2) return
      const headerLen = view.getUint16(0)
      if (view.byteLength < 2 + headerLen) return
      chunks.push(ev.data.slice(2 + headerLen))
    }
    ws.onerror = () => done(new Error('ws error'))
    ws.onclose = () => done()
    ws.send(edgeConfigFrame(edgeDateToString()))
    ws.send(edgeSsmlFrame(text, voice, ratePct))
  })
}

async function edgeProbeBrowser() {
  if (typeof WebSocket === 'undefined' || typeof crypto?.subtle === 'undefined') return false
  try {
    const url = await edgeBuildUrl()
    const ws = await edgeConnect(url)
    return new Promise((resolve) => {
      let settled = false
      const timer = setTimeout(() => finish(false), 8000)
      function finish(ok) {
        if (settled) return
        settled = true
        clearTimeout(timer)
        try {
          ws.close()
        } catch {
          // ignore
        }
        resolve(ok)
      }
      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') finish(true)
      }
      ws.onerror = () => finish(false)
      ws.onclose = () => finish(false)
      ws.send(edgeConfigFrame(edgeDateToString()))
      ws.send(edgeSsmlFrame('あ', 'ja-JP-NanamiNeural', 0))
    })
  } catch {
    return false
  }
}

async function edgeSynthesizeServer(text, voice, ratePct) {
  const res = await fetch(
    `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${ratePct}`,
  )
  if (!res.ok) throw new Error('edge tts failed')
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.startsWith('audio/')) throw new Error('edge tts not audio')
  return res.blob()
}

function playEdgeBlob(blob, onEnd) {
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
  audio.play().catch((e) => {
    audio.onended = null
    audio.onerror = null
    URL.revokeObjectURL(urlObj)
    if (activeAudio === audio) activeAudio = null
    throw e
  })
  return 'edge'
}

async function edgeSpeak(text, rate, onEnd) {
  const myToken = ++activeEdgeToken
  const ratePct = Math.round((rate - 1) * 100)
  const voice = edgeVoiceForLang(currentLang)
  let blob
  try {
    blob = await edgeSynthesizeBrowser(text, voice, ratePct)
  } catch (e) {
    if (myToken !== activeEdgeToken) return null
    blob = await edgeSynthesizeServer(text, voice, ratePct)
  }
  if (myToken !== activeEdgeToken) return null
  return playEdgeBlob(blob, onEnd)
}

function googleTtsUrl(text) {
  const tl = currentLang === 'en' ? 'en' : 'ja'
  const q = String(text).slice(0, 180)
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${tl}&client=tw-ob`
}

async function playGoogle(text, onEnd) {
  const audio = new Audio()
  audio.referrerPolicy = 'no-referrer'
  audio.src = googleTtsUrl(text)
  activeAudio = audio
  const cleanup = () => {
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
    if (activeAudio === audio) activeAudio = null
    throw e
  }
  return 'google'
}

export async function speakTextAsync(text, { rate = 1, onEnd } = {}) {
  stopSpeech()
  if (shouldTryEdge()) {
    try {
      const engine = await edgeSpeak(text, rate, onEnd)
      if (engine === null) return 'none'
      edgeChecked = true
      return engine
    } catch {
      edgeChecked = false
    }
  }
  try {
    return await playGoogle(text, onEnd)
  } catch {
    const ok = speakText(text, { rate, onEnd })
    return ok ? 'web' : 'none'
  }
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
    const googleOrFallback = () => {
      playGoogle(text, () => done('google')).catch(() => {
        const ok = speakText(text, { rate, onEnd: () => done('web') })
        if (!ok) done('none')
      })
    }
    if (shouldTryEdge()) {
      edgeSpeak(text, rate, () => done('edge'))
        .then((engine) => {
          if (engine === null) done('none')
        })
        .catch(() => {
          edgeChecked = false
          googleOrFallback()
        })
    } else {
      googleOrFallback()
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
  activeEdgeToken += 1
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
