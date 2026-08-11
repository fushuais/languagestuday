import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import { renderAnswer } from '../data/interview.js'
import {
  readingOf,
  speakTextAsync,
  stopSpeech,
  speakSequence,
  cancelSequence,
  getSpeechPrefs,
} from '../utils/speech.js'
import { playStart, playFinish, playTick, playCount } from '../utils/sound.js'
import { tap as hapticTap, success as hapticSuccess } from '../utils/haptics.js'
import { GRADES, scoreSession } from '../utils/scoring.js'
import useShortcuts from '../hooks/useShortcuts.js'
import useEdgeStatus from '../hooks/useEdgeStatus.js'

const DURATIONS = [
  { label: '1分', value: 60 },
  { label: '2分', value: 120 },
  { label: '3分', value: 180 },
  { label: '5分', value: 300 },
]

const RADIUS = 100
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function splitSentences(text) {
  return String(text)
    .split(/(?<=[。！？!?])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function PracticeView({ topic, categoryLabel, levelLabel, profile, overrides, topicStates, onToggleTopicState, onAddRecord, onNext, onActiveChange, lang = 'ja' }) {
  const [phase, setPhase] = useState('prep')
  const [duration, setDuration] = useState(120)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [sentences, setSentences] = useState(0)
  const [speakingTag, setSpeakingTag] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const [hint, setHint] = useState(null)
  const [result, setResult] = useState(null)
  const [seq, setSeq] = useState(null)
  const [paceIdx, setPaceIdx] = useState(0)
  const [paceAuto, setPaceAuto] = useState(true)
  const edge = useEdgeStatus(false)
  const baseRef = useRef(0)
  const hintIdxRef = useRef(0)
  const hintTimerRef = useRef(null)
  const playTokenRef = useRef(0)

  const pacePool = useMemo(() => {
    const list = []
    for (const k of topic.keywords || []) list.push({ type: 'キーワード', text: readingOf(k) })
    for (const e of topic.expressions || []) list.push({ type: 'フレーズ', text: e })
    for (const q of topic.questions || []) list.push({ type: '質問', text: q })
    return list
  }, [topic])

  const target = Math.max(1, Math.round(duration / 12))

  const modelText =
    topic.interviewId != null && overrides?.[topic.interviewId]
      ? overrides[topic.interviewId]
      : renderAnswer(topic.model, profile)

  const stopAll = useCallback(() => {
    stopSpeech()
    setSpeakingTag(null)
  }, [])

  const finishSession = useCallback(
    (early) => {
      clearTimeout(hintTimerRef.current)
      stopAll()
      setRunning(false)
      playFinish()
      hapticSuccess()
      const comp = scoreSession({ sentences, duration, elapsed, finished: !early })
      setResult(comp)
      onAddRecord({
        id: Date.now(),
        topicId: topic.id,
        topicTitle: topic.title,
        topicZh: topic.titleZh,
        category: topic.category,
        duration,
        sentences,
        score: comp.score,
        grade: comp.grade,
        finished: !early,
        date: new Date().toISOString(),
      })
      setPhase('done')
    },
    [sentences, duration, elapsed, topic, onAddRecord, stopAll],
  )

  useEffect(() => () => clearTimeout(hintTimerRef.current), [])

  useEffect(() => () => cancelSequence(), [])

  useEffect(() => {
    onActiveChange?.(phase === 'run')
    return () => onActiveChange?.(false)
  }, [phase, onActiveChange])

  useEffect(() => {
    const base = '日本語スピーキング | 日语口语练习'
    if (phase === 'run' && running) {
      document.title = `練習中… ${topic.title} | 日本語スピーキング`
    } else if (phase === 'done') {
      document.title = `お疲れ様！${result?.grade ?? ''} | 日本語スピーキング`
    } else if (phase === 'count') {
      document.title = `準備… ${topic.title} | 日本語スピーキング`
    } else {
      document.title = base
    }
    return () => {
      document.title = base
    }
  }, [phase, running, topic, result])

  useEffect(() => {
    if (phase !== 'run' || !running) return
    baseRef.current = Date.now() - elapsed * 1000
    const id = setInterval(() => {
      const next = Math.floor((Date.now() - baseRef.current) / 1000)
      setElapsed(next)
      if (next >= duration) {
        setRunning(false)
        finishSession(false)
      }
    }, 250)
    return () => clearInterval(id)
  }, [phase, running, duration, elapsed, finishSession])

  useEffect(() => {
    if (phase !== 'run' || !running || !paceAuto || pacePool.length === 0) return
    const id = setInterval(() => setPaceIdx((i) => (i + 1) % pacePool.length), 8000)
    return () => clearInterval(id)
  }, [phase, running, paceAuto, pacePool.length])

  useEffect(() => {
    if (phase !== 'count') return
    if (countdown <= 0) {
      setPhase('run')
      setRunning(true)
      playStart()
      return
    }
    playCount()
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, countdown])

  const startCountdown = () => {
    stopAll()
    setElapsed(0)
    setSentences(0)
    setResult(null)
    setCountdown(3)
    setPhase('count')
    hapticTap()
  }

  const startNow = () => {
    stopAll()
    setElapsed(0)
    setSentences(0)
    setResult(null)
    setPhase('run')
    setRunning(true)
    hapticTap()
  }

  const pause = () => setRunning(false)
  const resume = () => setRunning(true)

  const countSentence = () => {
    setSentences((s) => s + 1)
    playTick()
    hapticTap()
  }

  const reset = () => {
    clearTimeout(hintTimerRef.current)
    stopAll()
    setHint(null)
    setRunning(false)
    setElapsed(0)
    setSentences(0)
    setResult(null)
    setPaceIdx(0)
    setPaceAuto(true)
    setPhase('prep')
  }

  const showHint = () => {
    const parts = splitSentences(modelText)
    const all = parts.length ? parts : [modelText]
    const idx = hintIdxRef.current % all.length
    hintIdxRef.current += 1
    setHint(all[idx])
    clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => setHint(null), 7000)
  }

  const toggleTag = async (key, text) => {
    if (speakingTag === key) {
      stopAll()
      return
    }
    const eng = await speakTextAsync(text, { onEnd: () => setSpeakingTag(null) })
    if (eng !== 'none') setSpeakingTag(key)
  }

  const playAll = async () => {
    if (seq) {
      cancelSequence()
      setSeq(null)
      return
    }
    const token = ++playTokenRef.current
    cancelSequence()
    const parts = [
      ...topic.keywords.map((k) => readingOf(k)),
      ...topic.expressions,
      modelText,
    ]
    setSeq({ total: parts.length, current: 0 })
    await speakSequence(parts, {
      rate: getSpeechPrefs().rate,
      onProgress: (i) => {
        if (playTokenRef.current === token) setSeq({ total: parts.length, current: i })
      },
      onEnd: () => {
        if (playTokenRef.current === token) setSeq(null)
      },
    })
    if (playTokenRef.current === token) setSeq(null)
  }

  const nextTopic = () => {
    stopAll()
    setHint(null)
    onNext()
    reset()
  }

  useShortcuts({
    ' ': phase === 'prep' ? startCountdown : phase === 'count' ? startNow : phase === 'run' ? (running ? countSentence : resume) : nextTopic,
    Enter: phase === 'prep' ? startCountdown : null,
    p: phase === 'run' ? (running ? pause : resume) : null,
    P: phase === 'run' ? (running ? pause : resume) : null,
    n: phase === 'prep' || phase === 'done' ? nextTopic : null,
    N: phase === 'prep' || phase === 'done' ? nextTopic : null,
    h: phase === 'run' ? showHint : null,
    H: phase === 'run' ? showHint : null,
    r: phase === 'prep' || phase === 'run' ? (running ? null : reset) : null,
    R: phase === 'prep' || phase === 'run' ? (running ? null : reset) : null,
    Escape: () => {
      setHint(null)
      stopAll()
    },
  })

  const progress = duration ? elapsed / duration : 0
  const remaining = Math.max(0, duration - elapsed)
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const barClass =
    progress > 0.8 ? 'warning' : phase === 'run' && running ? 'running' : ''

  const renderTimer = () => (
    <div className="timer-wrap">
      <div className="timer-ring">
        <svg width="220" height="220">
          <circle className="track" cx="110" cy="110" r={RADIUS} fill="none" strokeWidth="10" />
          <circle
            className={`bar ${barClass}`}
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <div className="timer-center">
          <div className="time">
            {mm}:{ss}
          </div>
          <div className="state">
            {phase === 'done'
              ? 'お疲れ様！🎉'
              : phase === 'run'
                ? running
                  ? '話し続けよう！'
                  : elapsed > 0
                    ? '一時停止中'
                    : 'スタート！'
                : '準備はいい？'}
          </div>
        </div>
      </div>

      <div className="duration-row">
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            className={`duration-btn ${duration === d.value ? 'active' : ''}`}
            onClick={() => {
              setDuration(d.value)
              reset()
            }}
            disabled={phase === 'run' || phase === 'count'}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )

  if (phase === 'prep') {
    return (
      <div className="practice-layout">
        <section className="panel topic-panel">
          <h2>
            {topic.emoji} {topic.title}
          </h2>
          <div className="meta">
            <span className="chip" style={{ padding: '3px 10px' }}>
              {categoryLabel}
            </span>
            {levelLabel && (
              <span className="chip" style={{ padding: '3px 10px', borderColor: 'var(--gold)' }}>
                {levelLabel}
              </span>
            )}
            <span>{topic.titleZh}</span>
            <button
              className={`mini-mark ${topicStates?.[topic.id]?.fav ? 'on' : ''}`}
              onClick={() => onToggleTopicState(topic.id, 'fav')}
              title="收藏这个话题"
            >
              ⭐
            </button>
            <button
              className={`mini-mark ${topicStates?.[topic.id]?.mastered ? 'on' : ''}`}
              onClick={() => onToggleTopicState(topic.id, 'mastered')}
              title="标记为已掌握"
            >
              ✅
            </button>
          </div>

          <div className="block">
            <div className="block-title">使えるキーワード · 关键词（点击发音）</div>
            <div className="tags">
              {topic.keywords.map((k) => (
                <button
                  key={k}
                  className={`tag kw playable ${speakingTag === `kw:${k}` ? 'playing' : ''}`}
                  onClick={() => toggleTag(`kw:${k}`, readingOf(k))}
                >
                  {k} <span className="mini-spk">🔊</span>
                </button>
              ))}
            </div>
          </div>

          <div className="block">
            <div className="block-title">フレーズ · 常用句型（点击发音）</div>
            <div className="tags">
              {topic.expressions.map((e) => (
                <button
                  key={e}
                  className={`tag exp playable ${speakingTag === `exp:${e}` ? 'playing' : ''}`}
                  onClick={() => toggleTag(`exp:${e}`, e)}
                >
                  {e} <span className="mini-spk">🔊</span>
                </button>
              ))}
            </div>
          </div>

          <div className="block">
            <div className="block-title">質問に答えよう · 试着回答</div>
            <div className="questions">
              {topic.questions.map((q) => (
                <div key={q} className="question">
                  {q}
                </div>
              ))}
            </div>
          </div>

          <div className="block model-block">
            <div className="block-title">
              標準例文 · 示范范文（影子跟读）
              {topic.interviewId != null && overrides?.[topic.interviewId] && (
                <span className="override-badge">已自定义</span>
              )}
            </div>
            <div className="model-text">{modelText}</div>
            <div className="model-actions">
              <SpeechPlayer text={modelText} lang={lang} />
              <button
                className={`btn btn-ghost play-all-btn ${seq ? 'active' : ''}`}
                onClick={playAll}
                title="连续朗读：关键词 → 句型 → 范文"
              >
                {seq
                  ? `⏹ 一括再生中 ${seq.current + 1}/${seq.total}`
                  : '▶ 一括再生（全文）'}
              </button>
            </div>
            {edge === 'fallback' && (
              <div className="edge-fallback-note">
                ⚠️ Edge 神経音声に接続できません。システムの日本語音声で再生しています。
              </div>
            )}
          </div>

          <div className="tips">
            💡 技巧：先说「標準例文」练习发音，再自己组织语言连续说。卡住时按 H 或点「ヒント」，围绕提示继续扩展，别停口！
          </div>
        </section>

        <aside className="panel">
          {renderTimer()}
          <div className="controls">
            <button className="btn btn-primary" onClick={startCountdown}>
              ▶ 3,2,1 で始める
            </button>
            <button className="btn btn-ghost" onClick={nextTopic}>
              次の話題 →
            </button>
          </div>
          <div className="shortcut-hints">
            <div className="shortcut-hint">
              <kbd>Space</kbd> 開始 / 数句
            </div>
            <div className="shortcut-hint">
              <kbd>P</kbd> 一時停止
            </div>
            <div className="shortcut-hint">
              <kbd>H</kbd> ヒント
            </div>
            <div className="shortcut-hint">
              <kbd>N</kbd> 次の話題
            </div>
            <div className="shortcut-hint">
              <kbd>R</kbd> リセット
            </div>
          </div>
        </aside>
      </div>
    )
  }

  if (phase === 'count') {
    return (
      <div className="countdown-overlay">
        <div className="count-num" key={countdown}>
          {countdown}
        </div>
        <div className="count-label">準備はいい？</div>
        <button className="btn btn-ghost" onClick={startNow}>
          スキップ（すぐ始める）
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const meta = GRADES.find((g) => g.g === result.grade)
    const target = result.target
    return (
      <div className="panel done-panel">
        <div className={`grade-badge grade-${result.grade}`}>{meta.emoji}</div>
        <div className={`grade-letter grade-${result.grade}`}>{result.grade}</div>
        <h2>練習完了！</h2>
        <p className="grade-msg">{meta.msg}</p>

        <div className="done-stats">
          <div className="stat">
            <div className="num">{sentences}</div>
            <div className="label">話した文数</div>
          </div>
          <div className="stat">
            <div className="num">
              {target}
            </div>
            <div className="label">目標句数</div>
          </div>
          <div className="stat">
            <div className="num">
              {result.score}
            </div>
            <div className="label">得分 /100</div>
          </div>
        </div>

        <details className="done-review">
          <summary>📖 回顾范文 · 影子跟读</summary>
          <div className="done-review-body">
            <p className="model-text">{modelText}</p>
            <SpeechPlayer text={modelText} lang={lang} />
          </div>
        </details>

        <div className="next-row">
          <button className="btn btn-primary" onClick={startCountdown}>
            🔁 もう一度
          </button>
          <button className="btn btn-ghost" onClick={nextTopic}>
            次の話題へ →
          </button>
        </div>
        <div className="shortcut-hints" style={{ justifyContent: 'center' }}>
          <div className="shortcut-hint">
            <kbd>N</kbd> 次の話題
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="practice-layout">
      <section className="panel topic-panel">
        <h2>
          {topic.emoji} {topic.title}
        </h2>
        <div className="meta">
          <span className="chip" style={{ padding: '3px 10px' }}>
            {categoryLabel}
          </span>
          <span>{topic.titleZh}</span>
        </div>

        {pacePool.length > 0 && (
          <div className="pace-card">
            <div className="pace-head">
              <span className="pace-type">{pacePool[paceIdx % pacePool.length].type}</span>
              <span className="pace-count">
                {(paceIdx % pacePool.length) + 1}/{pacePool.length}
              </span>
              <button
                className={`pace-auto ${paceAuto ? 'on' : ''}`}
                onClick={() => setPaceAuto((v) => !v)}
                title={paceAuto ? '暂停自动轮播' : '开启自动轮播'}
              >
                {paceAuto ? '⏸ 自動' : '▶ 自動'}
              </button>
            </div>
            <div className="pace-text" key={paceIdx}>
              {pacePool[paceIdx % pacePool.length].text}
            </div>
            <div className="pace-actions">
              <button
                className="pace-nav"
                onClick={() => setPaceIdx((paceIdx - 1 + pacePool.length) % pacePool.length)}
              >
                ‹ 前
              </button>
              <button
                className="pace-nav"
                onClick={() => setPaceIdx((paceIdx + 1) % pacePool.length)}
              >
                次 ›
              </button>
            </div>
          </div>
        )}

        <div className="block">
          <div className="block-title">キーワード（点击发音）</div>
          <div className="tags">
            {topic.keywords.map((k) => (
              <button
                key={k}
                className={`tag kw playable ${speakingTag === `kw:${k}` ? 'playing' : ''}`}
                onClick={() => toggleTag(`kw:${k}`, readingOf(k))}
              >
                {k} <span className="mini-spk">🔊</span>
              </button>
            ))}
          </div>
        </div>

        <div className="block">
          <div className="block-title">フレーズ（点击发音）</div>
          <div className="tags">
            {topic.expressions.map((e) => (
              <button
                key={e}
                className={`tag exp playable ${speakingTag === `exp:${e}` ? 'playing' : ''}`}
                onClick={() => toggleTag(`exp:${e}`, e)}
              >
                {e} <span className="mini-spk">🔊</span>
              </button>
            ))}
          </div>
        </div>

        <div className="block">
          <div className="block-title">質問</div>
          <div className="questions">
            {topic.questions.map((q) => (
              <div key={q} className="question">
                {q}
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="panel">
        {renderTimer()}

        {hint && (
          <div className="hint-overlay">
            <div className="hint-title">💡 ヒント</div>
            <div className="hint-text">{hint}</div>
            <button className="hint-close" onClick={() => setHint(null)}>
              ✕ 閉じる
            </button>
          </div>
        )}

        <div className="controls">
          {running ? (
            <button className="btn btn-ghost" onClick={pause}>
              ⏸ 一時停止
            </button>
          ) : (
            <button className="btn btn-primary" onClick={resume}>
              ▶ 続ける
            </button>
          )}
          <button className="btn btn-ghost" onClick={showHint}>
            💡 ヒント
          </button>
          <button className="btn btn-ghost" onClick={() => finishSession(true)}>
            終了して記録
          </button>
        </div>

        <div className="counter-box">
          <div className="block-title" style={{ marginBottom: 0 }}>
            話した文数 · 句数
          </div>
          <div className="big">{sentences}</div>
          <div className="target-row">
            <span className="target-label">目標 {target} 句</span>
            <div className="target-bar">
              <div
                className={`target-fill ${sentences >= target ? 'done' : ''}`}
                style={{ width: `${Math.min(100, (sentences / target) * 100)}%` }}
              />
            </div>
          </div>
          <button className="counter-btn" onClick={countSentence}>
            🗣 話した！ (＋1句) <span style={{ opacity: 0.7 }}>· Space</span>
          </button>
          {sentences > 0 && (
            <button
              className="btn btn-ghost"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={() => setSentences((s) => Math.max(0, s - 1))}
            >
              取消一步
            </button>
          )}
        </div>
      </aside>

      {phase === 'run' && (
        <div className="mobile-run-bar">
          <button className="mrb-count" onClick={countSentence}>
            🗣 話した！<span>＋1句</span>
          </button>
          <button className="btn mrb-btn" onClick={running ? pause : resume}>
            {running ? '⏸' : '▶'}
          </button>
          <button className="btn mrb-btn" onClick={showHint}>
            💡
          </button>
          <button className="btn mrb-btn mrb-end" onClick={() => finishSession(true)} title="終了して記録">
            終
          </button>
        </div>
      )}
    </div>
  )
}
