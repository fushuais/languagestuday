import { useMemo, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import { WORD_SCENES } from '../data/words.js'
import { tap, success } from '../utils/haptics.js'

const KEY = 'nihongo-words-v1'

const LEVEL_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'basic', label: '初級 N5·N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
]

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2']

function filterWords(words, level) {
  if (level === 'all') return words
  if (level === 'basic') return words.filter((w) => w.level === 'N5' || w.level === 'N4')
  return words.filter((w) => w.level === level)
}

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

const LevelBadge = ({ level }) => <span className={`word-level lv-${level}`}>{level}</span>

export default function WordsView() {
  const [sceneId, setSceneId] = useState(null)
  const [mode, setMode] = useState('list')
  const [level, setLevel] = useState('all')
  const [learned, setLearned] = useState(loadProgress)
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quiz, setQuiz] = useState(null)

  const allWords = useMemo(() => WORD_SCENES.flatMap((s) => s.words), [])
  const scene = WORD_SCENES.find((s) => s.id === sceneId)
  const filtered = useMemo(
    () => (scene ? filterWords(scene.words, level) : []),
    [scene, level],
  )
  const learnedInScene = scene ? Object.keys(learned[scene.id] || {}).filter((k) => learned[scene.id][k]).length : 0

  const openScene = (s) => {
    tap()
    setSceneId(s.id)
    setMode('list')
    setLevel('all')
    setCardIdx(0)
    setFlipped(false)
    setQuiz(null)
  }

  const changeLevel = (lv) => {
    if (lv === level) return
    tap()
    setLevel(lv)
    setCardIdx(0)
    setFlipped(false)
    if (mode === 'quiz') startQuiz(lv)
    else setQuiz(null)
  }

  const toggleLearned = (w) => {
    if (!scene) return
    const cur = learned[scene.id] || {}
    const next = { ...learned, [scene.id]: { ...cur, [w.ja]: !cur[w.ja] } }
    setLearned(next)
    saveProgress(next)
    tap()
  }

  const startQuiz = (lv = level) => {
    if (!scene) return
    tap()
    const words = shuffle(filterWords(scene.words, lv))
    if (!words.length) {
      setQuiz(null)
      return
    }
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
    if (known) toggleLearned(filtered[cardIdx])
    if (cardIdx + 1 >= filtered.length) {
      setMode('list')
      setCardIdx(0)
      setFlipped(false)
      return
    }
    setCardIdx((i) => i + 1)
    setFlipped(false)
  }

  if (!scene) {
    const totalWords = allWords.length
    return (
      <section>
        <h2 className="section-title">単語帳 · 按场景记单词</h2>
        <p className="section-sub">
          共 {WORD_SCENES.length} 个生活场景 · {totalWords} 词，参照 N4/N3/N2 考前对策目录分类，覆盖 N5–N2 常用词汇。
        </p>
        <div className="word-scene-grid">
          {WORD_SCENES.map((s) => {
            const l = learned[s.id] || {}
            const count = s.words.filter((w) => l[w.ja]).length
            const pct = Math.round((count / s.words.length) * 100)
            const chips = LEVEL_ORDER.map((lv) => ({
              lv,
              n: s.words.filter((w) => w.level === lv).length,
            }))
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
                <span className="ws-levels">
                  {chips.map((c) => (
                    <span key={c.lv} className={`word-level lv-${c.lv}`}>
                      {c.lv} {c.n}
                    </span>
                  ))}
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

      <div className="word-level-filter" role="tablist" aria-label="级别筛选">
        {LEVEL_FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={level === f.id}
            className={level === f.id ? 'active' : ''}
            onClick={() => changeLevel(f.id)}
          >
            {f.label}
          </button>
        ))}
        <span className="wl-count">当前 {filtered.length} 词</span>
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
              if (m.id === 'cards') {
                setCardIdx(0)
                setFlipped(false)
              }
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'list' && (
        <div className="word-list">
          {filtered.map((w) => {
            const done = !!learned[scene.id]?.[w.ja]
            return (
              <div key={w.ja} className={`word-row ${done ? 'learned' : ''}`}>
                <div className="word-main">
                  <span className="word-ja">{w.ja}</span>
                  <span className="word-kana">{w.kana}</span>
                </div>
                <LevelBadge level={w.level} />
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
          {filtered.length ? (
            <>
              <div className="flashcard" onClick={() => setFlipped((v) => !v)}>
                <div className={`fc-inner ${flipped ? 'flipped' : ''}`}>
                  <div className="fc-face fc-front">
                    <div className="fc-ja">{filtered[cardIdx].ja}</div>
                    <div className="fc-kana">{filtered[cardIdx].kana}</div>
                    <SpeechPlayer mini text={filtered[cardIdx].ja} lang="ja" />
                    <span className={`word-level lv-${filtered[cardIdx].level}`}>
                      {filtered[cardIdx].level}
                    </span>
                    <div className="fc-hint">点击卡片看中文</div>
                  </div>
                  <div className="fc-face fc-back">
                    <div className="fc-zh">{filtered[cardIdx].zh}</div>
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
                {cardIdx + 1} / {filtered.length}
              </div>
            </>
          ) : (
            <div className="quiz-result">
              <p>当前级别没有单词，换个筛选试试。</p>
            </div>
          )}
        </div>
      )}

      {mode === 'quiz' && quiz && (
        <div className="quiz">
          {quiz.done ? (
            <div className="quiz-result">
              <div className="quiz-score-big">
                {quiz.items.length ? Math.round((quiz.score / quiz.items.length) * 100) : 0}%
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
