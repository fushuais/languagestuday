import { useMemo, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import { WORD_SCENES } from '../data/words.js'
import { tap, success } from '../utils/haptics.js'

const KEY = 'nihongo-words-v1'

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // ignore
  }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WordsView() {
  const [sceneId, setSceneId] = useState(null)
  const [mode, setMode] = useState('list')
  const [learned, setLearned] = useState(loadProgress)
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quiz, setQuiz] = useState(null)

  const allWords = useMemo(() => WORD_SCENES.flatMap((s) => s.words), [])
  const scene = WORD_SCENES.find((s) => s.id === sceneId)

  const learnedInScene = scene ? Object.keys(learned[scene.id] || {}).filter((k) => learned[scene.id][k]).length : 0

  const openScene = (s) => {
    tap()
    setSceneId(s.id)
    setMode('list')
    setCardIdx(0)
    setFlipped(false)
    setQuiz(null)
  }

  const toggleLearned = (w) => {
    if (!scene) return
    const cur = learned[scene.id] || {}
    const next = { ...learned, [scene.id]: { ...cur, [w.ja]: !cur[w.ja] } }
    setLearned(next)
    saveProgress(next)
    tap()
  }

  const startQuiz = () => {
    if (!scene) return
    tap()
    const words = shuffle(scene.words)
    const items = words.map((w) => {
      const distractors = shuffle(allWords.filter((x) => x.zh !== w.zh).map((x) => x.zh)).slice(0, 3)
      return { w, options: shuffle([w.zh, ...distractors]) }
    })
    setQuiz({ items, idx: 0, score: 0, answered: false, picked: null, done: false })
  }

  const answer = (i) => {
    if (!quiz || quiz.answered) return
    const item = quiz.items[quiz.idx]
    const correct = item.options[i] === item.w.zh
    const next = { ...quiz, answered: true, picked: i, score: quiz.score + (correct ? 1 : 0) }
    setQuiz(next)
    if (correct) success()
    else tap()
    if (correct) {
      const cur = learned[scene.id] || {}
      const np = { ...learned, [scene.id]: { ...cur, [item.w.ja]: true } }
      setLearned(np)
      saveProgress(np)
    }
  }

  const nextQ = () => {
    if (!quiz) return
    tap()
    if (quiz.idx + 1 >= quiz.items.length) {
      setQuiz({ ...quiz, done: true })
    } else {
      setQuiz({ ...quiz, idx: quiz.idx + 1, answered: false, picked: null })
    }
  }

  const nextCard = (known) => {
    if (!scene) return
    if (known) toggleLearned(scene.words[cardIdx])
    if (cardIdx + 1 >= scene.words.length) {
      setMode('list')
      setCardIdx(0)
      setFlipped(false)
      return
    }
    setCardIdx((i) => i + 1)
    setFlipped(false)
  }

  if (!scene) {
    return (
      <section>
        <h2 className="section-title">単語帳 · 按场景记单词</h2>
        <p className="section-sub">
          共 {WORD_SCENES.length} 个生活场景，每个约 18 个高频词。按场景记忆，边听边练。
        </p>
        <div className="word-scene-grid">
          {WORD_SCENES.map((s) => {
            const l = learned[s.id] || {}
            const count = s.words.filter((w) => l[w.ja]).length
            const pct = Math.round((count / s.words.length) * 100)
            return (
              <button key={s.id} className="word-scene-card" onClick={() => openScene(s)}>
                <span className="ws-emoji">{s.emoji}</span>
                <span className="ws-title">
                  {s.title}
                  <small>{s.zh}</small>
                </span>
                <span className="ws-count">
                  {count}/{s.words.length}
                </span>
                <span className="ws-bar">
                  <span style={{ width: `${pct}%` }} />
                </span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={() => setSceneId(null)}>
          ← 场景列表
        </button>
        <h2>
          {scene.emoji} {scene.title}
          <small>
            {scene.zh} · 已掌握 {learnedInScene}/{scene.words.length}
          </small>
        </h2>
      </div>

      <div className="word-mode-tabs" role="tablist" aria-label="学习模式">
        {[
          { id: 'list', label: '📚 単語一覧' },
          { id: 'cards', label: '🃏 暗記カード' },
          { id: 'quiz', label: '🎯 クイズ' },
        ].map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={mode === m.id ? 'active' : ''}
            onClick={() => {
              setMode(m.id)
              if (m.id === 'quiz') startQuiz()
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'list' && (
        <div className="word-list">
          {scene.words.map((w) => {
            const done = !!learned[scene.id]?.[w.ja]
            return (
              <div key={w.ja} className={`word-row ${done ? 'learned' : ''}`}>
                <div className="word-main">
                  <span className="word-ja">{w.ja}</span>
                  <span className="word-kana">{w.kana}</span>
                </div>
                <span className="word-zh">{w.zh}</span>
                <SpeechPlayer mini text={w.ja} lang="ja" />
                <button
                  className={`mini-mark ${done ? 'on' : ''}`}
                  onClick={() => toggleLearned(w)}
                  title={done ? '取消已掌握' : '标记已掌握'}
                >
                  ✅
                </button>
              </div>
            )
          })}
        </div>
      )}

      {mode === 'cards' && (
        <div className="card-study">
          <div className="flashcard" onClick={() => setFlipped((v) => !v)}>
            <div className={`fc-inner ${flipped ? 'flipped' : ''}`}>
              <div className="fc-face fc-front">
                <div className="fc-ja">{scene.words[cardIdx].ja}</div>
                <div className="fc-kana">{scene.words[cardIdx].kana}</div>
                <SpeechPlayer mini text={scene.words[cardIdx].ja} lang="ja" />
                <div className="fc-hint">点击卡片看中文</div>
              </div>
              <div className="fc-face fc-back">
                <div className="fc-zh">{scene.words[cardIdx].zh}</div>
                <div className="fc-hint">点击卡片回正面</div>
              </div>
            </div>
          </div>
          <div className="fc-actions">
            <button className="btn btn-ghost" onClick={() => nextCard(false)}>
              😥 まだ
            </button>
            <button className="btn btn-primary" onClick={() => nextCard(true)}>
              ✅ 覚えた
            </button>
          </div>
          <div className="fc-progress">
            {cardIdx + 1} / {scene.words.length}
          </div>
        </div>
      )}

      {mode === 'quiz' && quiz && (
        <div className="quiz">
          {quiz.done ? (
            <div className="quiz-result">
              <div className="quiz-score-big">
                {Math.round((quiz.score / quiz.items.length) * 100)}%
              </div>
              <p>
                正解 {quiz.score} / {quiz.items.length}
              </p>
              <div className="next-row">
                <button className="btn btn-primary" onClick={startQuiz}>
                  🔁 もう一度
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuiz(null)
                    setMode('list')
                  }}
                >
                  回到单词表
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="quiz-q">
                <div className="quiz-word">
                  {quiz.items[quiz.idx].w.ja}
                  <span className="quiz-kana">{quiz.items[quiz.idx].w.kana}</span>
                  <SpeechPlayer mini text={quiz.items[quiz.idx].w.ja} lang="ja" />
                </div>
                <div className="quiz-options">
                  {quiz.items[quiz.idx].options.map((o, i) => (
                    <button
                      key={o}
                      className={`quiz-opt ${quiz.answered ? (o === quiz.items[quiz.idx].w.zh ? 'correct' : i === quiz.picked ? 'wrong' : '') : ''}`}
                      onClick={() => answer(i)}
                      disabled={quiz.answered}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div className="quiz-foot">
                <span className="quiz-progress">
                  {quiz.idx + 1} / {quiz.items.length} · 得分 {quiz.score}
                </span>
                {quiz.answered && (
                  <button className="btn btn-primary" onClick={nextQ}>
                    下一个 →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
