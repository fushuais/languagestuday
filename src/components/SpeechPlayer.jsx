import { useEffect, useState } from 'react'
import {
  initVoices,
  speakTextAsync,
  stopSpeech,
  getSpeechPrefs,
  setSpeechPrefs,
  EDGE_VOICES_JA,
  EDGE_VOICES_EN,
  edgeVoiceForLang,
} from '../utils/speech.js'
import useEdgeStatus from '../hooks/useEdgeStatus.js'

export default function SpeechPlayer({ text, mini = false, compact = false, lang = 'ja' }) {
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rate, setRate] = useState(() => getSpeechPrefs().rate)
  const [voice, setVoice] = useState(() => edgeVoiceForLang(lang))
  const [engine, setEngine] = useState(null)
  const edge = useEdgeStatus(false)
  const voices = lang === 'en' ? EDGE_VOICES_EN : EDGE_VOICES_JA

  useEffect(() => {
    initVoices()
    const sync = (e) => {
      const p = e.detail
      setVoice(p.voice)
      setRate(p.rate)
    }
    window.addEventListener('speech-prefs-changed', sync)
    return () => window.removeEventListener('speech-prefs-changed', sync)
  }, [])

  useEffect(() => {
    setVoice(edgeVoiceForLang(lang))
    if (speaking || loading) {
      stopSpeech()
      setSpeaking(false)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const toggle = async () => {
    if (speaking || loading) {
      stopSpeech()
      setSpeaking(false)
      setLoading(false)
      return
    }
    setLoading(true)
    const eng = await speakTextAsync(text, { rate, onEnd: () => setSpeaking(false) })
    setLoading(false)
    if (eng !== 'none') {
      setSpeaking(true)
      setEngine(eng)
    }
  }

  const pickVoice = (v) => {
    setVoice(v)
    setSpeechPrefs({ voice: v })
    if (speaking || loading) {
      stopSpeech()
      setSpeaking(false)
      setLoading(false)
    }
  }

  const pickRate = (r) => {
    setRate(r)
    setSpeechPrefs({ rate: r })
    if (speaking || loading) {
      stopSpeech()
      setSpeaking(false)
      setLoading(false)
    }
  }

  const disabled = !text

  const statusBadge = engine ? (
    <span className={`engine-badge ${engine}`}>
      {engine === 'edge' ? '⚡ 神経音声' : '🎧 システム音声'}
    </span>
  ) : edge === 'fallback' ? (
    <span className="engine-badge fallback" title="Edge 神经语音不可用，已自动回退到系统日语语音">
      ⚠️ Edge 不可用
    </span>
  ) : null

  if (mini) {
    return (
      <button
        className={`speaker mini ${speaking ? 'speaking' : ''} ${loading ? 'loading' : ''}`}
        title="发音"
        onClick={toggle}
        disabled={disabled}
      >
        {loading ? '⏳' : speaking ? '⏹' : '🔊'}
      </button>
    )
  }

  if (compact) {
    return (
      <button
        className={`speaker ${speaking ? 'speaking' : ''} ${loading ? 'loading' : ''}`}
        onClick={toggle}
        disabled={disabled}
        title="朗读"
      >
        {loading ? '⏳' : speaking ? '⏹' : '🔊'} {loading ? '読み上げ中…' : speaking ? '停止' : '朗读'}
      </button>
    )
  }

  return (
    <div className="speech-player">
      <button className="btn btn-primary" onClick={toggle} disabled={disabled || loading}>
        {loading ? '⏳ 読み上げ中…' : speaking ? '⏹ 停止' : '▶ 標準音声を聞く'}
      </button>

      <div className="voice-row">
        <select
          className="voice-select"
          value={voice}
          onChange={(e) => pickVoice(e.target.value)}
          title="神经语音音色"
        >
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        {statusBadge}
      </div>

      <div className="rate-row">
        <span className="rate-label">速度</span>
        {[1, 0.75, 0.5].map((r) => (
          <button
            key={r}
            className={`rate-btn ${rate === r ? 'active' : ''}`}
            onClick={() => pickRate(r)}
          >
            {r === 1 ? '普通' : r === 0.75 ? 'ゆっくり' : 'もっとゆっくり'}
          </button>
        ))}
      </div>
    </div>
  )
}
