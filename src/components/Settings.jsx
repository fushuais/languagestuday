import { useState } from 'react'
import {
  EDGE_VOICES_JA,
  EDGE_VOICES_EN,
  edgeVoiceForLang,
  getSpeechPrefs,
  setSpeechPrefs,
} from '../utils/speech.js'
import { setSoundEnabled, soundEnabledValue } from '../utils/sound.js'
import { setHapticsEnabled, hapticsEnabled, tap } from '../utils/haptics.js'

const RATES = [
  { value: 1, label: '普通' },
  { value: 0.75, label: 'ゆっくり' },
  { value: 0.5, label: 'もっとゆっくり' },
]

const ENGINES = [
  { id: 'auto', label: '自动', sub: 'Edge 神经语音优先，失败自动回退' },
  { id: 'google', label: '网络音声', sub: 'Google 在线语音' },
  { id: 'system', label: '系统音声', sub: '设备自带语音（可离线）' },
]

function isIOS() {
  return (
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.MSStream
  )
}

export default function Settings({ lang = 'ja', onClose }) {
  const prefs = getSpeechPrefs()
  const [voice, setVoice] = useState(() => edgeVoiceForLang(lang))
  const [rate, setRate] = useState(prefs.rate)
  const [engine, setEngine] = useState(prefs.engine ?? 'auto')
  const [sound, setSound] = useState(() => soundEnabledValue())
  const [haptic, setHaptic] = useState(() => hapticsEnabled())

  const voices = lang === 'en' ? EDGE_VOICES_EN : EDGE_VOICES_JA

  const pickVoice = (id) => {
    setVoice(id)
    setSpeechPrefs({ voice: id })
    tap()
  }

  const pickRate = (r) => {
    setRate(r)
    setSpeechPrefs({ rate: r })
    tap()
  }

  const pickEngine = (id) => {
    setEngine(id)
    setSpeechPrefs({ engine: id })
    tap()
  }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    tap()
  }

  const toggleHaptic = () => {
    const next = !haptic
    setHaptic(next)
    setHapticsEnabled(next)
    tap()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="settings-head">
          <div className="settings-title">设置 · 設定</div>
          <button className="settings-close" onClick={onClose} aria-label="关闭设置">
            ✕
          </button>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">语音 · 読み上げ</div>

          <div className="settings-row">
            <div className="settings-label">
              <span>音色</span>
              <small>神经语音角色</small>
            </div>
            <select
              className="settings-select"
              value={voice}
              onChange={(e) => pickVoice(e.target.value)}
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span>语速</span>
              <small>朗读速度</small>
            </div>
            <div className="settings-seg">
              {RATES.map((r) => (
                <button
                  key={r.value}
                  className={`seg-btn ${rate === r.value ? 'active' : ''}`}
                  onClick={() => pickRate(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row settings-row-col">
            <div className="settings-label">
              <span>朗读引擎</span>
              <small>优先使用哪种语音引擎</small>
            </div>
            <div className="settings-options">
              {ENGINES.map((e) => (
                <button
                  key={e.id}
                  className={`settings-option ${engine === e.id ? 'active' : ''}`}
                  onClick={() => pickEngine(e.id)}
                >
                  <b>{e.label}</b>
                  <small>{e.sub}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">反馈 · フィードバック</div>

          <div className="settings-row">
            <div className="settings-label">
              <span>音效</span>
              <small>开始 / 计数 / 完成提示音</small>
            </div>
            <button
              className={`ios-switch ${sound ? 'on' : ''}`}
              role="switch"
              aria-checked={sound}
              onClick={toggleSound}
            >
              <span className="ios-switch-knob" />
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span>震动</span>
              <small>
                {isIOS() ? 'iOS 不支持震动，将播放轻提示音代替' : '操作时的触感反馈'}
              </small>
            </div>
            <button
              className={`ios-switch ${haptic ? 'on' : ''}`}
              role="switch"
              aria-checked={haptic}
              onClick={toggleHaptic}
            >
              <span className="ios-switch-knob" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
