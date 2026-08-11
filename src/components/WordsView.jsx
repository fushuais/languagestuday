import { useCallback, useEffect, useMemo, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import { loadScenes, loadLevel, masteredAnywhere } from '../utils/vocab.js'
import { tap, success } from '../utils/haptics.js'

const KEY = 'nihongo-words-v1'
const LEVELS = ['N5', 'N4', 'N3', 'N2']
const LIB_TOTAL = { N5: 794, N4: 750, N3: 1796, N2: 3192 }

const LEVEL_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'basic', label: '初級 N5·N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
]

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

const EmptyHint = ({ text }) => (
  <div className="quiz-result">
    <p>{text}</p>
  </div>
)

const WordSpeech = ({ text }) => <SpeechPlayer mini text={text} lang="ja" />

export default function WordsView() {
  const [scenes, setScenes] = useState(null)
  const [view, setView] = useState('home')
  const [learned, setLearned] = useState(loadProgress)
  const [lastLearned, setLastLearned] = useState(null)

  useEffect(() => {
    loadScenes()
      .then(setScenes)
      .catch(() => setScenes([]))
  }, [])

  const markLearned = (set, theme, ja) => {
    const cur = set[theme] || {}
    const next = { ...set, [theme]: { ...cur, [ja]: !cur[ja] } }
    setLearned(next)
    saveProgress(next)
    setLastLearned({ theme, ja })
  }

  const go = (v) => {
    tap()
    setView(v)
  }

  if (!scenes) {
    return (
      <section>
        <h2 className="section-title">単語帳</h2>
        <p className="section-sub">加载词库中…</p>
      </section>
    )
  }

  if (view === 'home') {
    const totalScene = scenes.reduce((n, s) => n + s.words.length, 0)
    const libTotal = LEVELS.reduce((n, l) => n + LIB_TOTAL[l], 0)
    const sceneMastered = scenes.reduce(
      (n, s) => n + Object.keys(learned[s.id] || {}).filter((k) => learned[s.id][k]).length,
      0,
    )
    return (
      <section>
        <h2 className="section-title">単語帳</h2>
        <p className="section-sub">
          海量 JLPT 词库（N5–N2）按级别全量收录，可场景精选或全词库浏览复习。
        </p>
        <div className="word-entry-grid">
          <button className="word-entry-card" onClick={() => go('scenes')}>
            <span className="we-emoji">🗂️</span>
            <span className="we-title">
              场景精选
              <small>生活场景分类，适合日常积累</small>
            </span>
            <span className="we-count">
              {sceneMastered}/{totalScene} 已掌握
            </span>
          </button>
          <button className="word-entry-card" onClick={() => go('library')}>
            <span className="we-emoji">📖</span>
            <span className="we-title">
              JLPT 全词库
              <small>N5–N2 全量真题词库</small>
            </span>
            <span className="we-count">{libTotal} 词</span>
          </button>
        </div>
        <p className="word-source">
          词库来源：开源 JLPT 牌组 tcf245（eggrolls-JLPT10k v3.5）· CC BY-NC 4.0
        </p>
      </section>
    )
  }

  if (view === 'library') return <LibraryArea learned={learned} goHome={() => go('home')} />

  return (
    <SceneArea
      scenes={scenes}
      learned={learned}
      markLearned={markLearned}
      goHome={() => go('home')}
      lastLearned={lastLearned}
    />
  )
}

function SceneArea({ scenes, learned, markLearned, goHome }) {
  const [sceneId, setSceneId] = useState(null)
  const [mode, setMode] = useState('list')
  const [level, setLevel] = useState('all')
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quiz, setQuiz] = useState(null)

  const allWords = useMemo(() => scenes.flatMap((s) => s.words), [scenes])
  const scene = scenes.find((s) => s.id === sceneId)
  const filtered = useMemo(
    () => (scene ? filterWords(scene.words, level) : []),
    [scene, level],
  )
  const learnedInScene = scene
    ? Object.keys(learned[scene.id] || {}).filter((k) => learned[scene.id][k]).length
    : 0

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
    tap()
    markLearned(learned, scene.id, w.ja)
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
    if (correct) {
      success()
      markLearned(learned, scene.id, item.w.ja)
    } else tap()
  }

  const nextQ = () => {
    if (!quiz) return
    tap()
    if (quiz.idx + 1 >= quiz.items.length) setQuiz({ ...quiz, done: true })
    else setQuiz({ ...quiz, idx: quiz.idx + 1, answered: false, picked: null })
  }

  const nextCard = (known) => {
    if (!scene) return
    if (known) markLearned(learned, scene.id, filtered[cardIdx].ja)
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
    return (
      <>
        <div className="word-scene-head">
          <button className="btn btn-ghost" onClick={goHome}>
            ← 単語帳首页
          </button>
          <h2>🗂️ 场景精选</h2>
        </div>
        <p className="section-sub">
          共 {scenes.length} 个生活场景 · {allWords.length} 词，参照 N4/N3/N2 考前对策目录分类，覆盖 N5–N2 常用词汇。
        </p>
        <div className="word-scene-grid">
          {scenes.map((s) => {
            const l = learned[s.id] || {}
            const count = s.words.filter((w) => l[w.ja]).length
            const pct = Math.round((count / s.words.length) * 100)
            const chips = LEVELS.map((lv) => ({
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
        <p className="word-source">
          词库来源：开源 JLPT 牌组 tcf245（eggrolls-JLPT10k v3.5）· CC BY-NC 4.0
        </p>
      </>
    )
  }

  return (
    <>
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
                  {w.kana && <span className="word-kana">{w.kana}</span>}
                </div>
                <LevelBadge level={w.level} />
                <span className="word-zh">{w.zh}</span>
                <WordSpeech text={w.ja} />
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
                    {filtered[cardIdx].kana && (
                      <div className="fc-kana">{filtered[cardIdx].kana}</div>
                    )}
                    <WordSpeech text={filtered[cardIdx].ja} />
                    <span className={`word-level lv-${filtered[cardIdx].level}`}>
                      {filtered[cardIdx].level}
                    </span>
                    <div className="fc-hint">点击卡片看中文</div>
                  </div>
                  <div className="fc-face fc-back">
                    <div className="fc-zh">{filtered[cardIdx].zh}</div>
                    {filtered[cardIdx].exJa && (
                      <div className="fc-ex">
                        <div className="fc-ex-ja">{filtered[cardIdx].exJa}</div>
                        <div className="fc-ex-zh">{filtered[cardIdx].exZh}</div>
                      </div>
                    )}
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
            <EmptyHint text="当前级别没有单词，换个筛选试试。" />
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
                  {quiz.items[quiz.idx].w.kana && (
                    <span className="quiz-kana">{quiz.items[quiz.idx].w.kana}</span>
                  )}
                  <WordSpeech text={quiz.items[quiz.idx].w.ja} />
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
    </>
  )
}

function LibraryArea({ learned, goHome }) {
  const [bank, setBank] = useState('N5')
  const [banks, setBanks] = useState({})
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(100)
  const [mode, setMode] = useState('list')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quiz, setQuiz] = useState(null)

  const words = useMemo(() => banks[bank] || [], [banks, bank])

  const ensure = useCallback((lv) => {
    if (banks[lv]) return Promise.resolve(banks[lv])
    return loadLevel(lv)
      .then((d) => {
        setBanks((b) => ({ ...b, [lv]: d }))
        return d
      })
      .catch(() => {
        setBanks((b) => ({ ...b, [lv]: [] }))
        return []
      })
  }, [banks])

  useEffect(() => {
    ensure(bank)
  }, [bank, ensure])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return words
    return words.filter((w) => w.ja.includes(q) || (w.kana && w.kana.includes(q)) || w.zh.includes(q))
  }, [words, search])

  const visible = filtered.slice(0, showCount)

  const changeBank = (lv) => {
    if (lv === bank) return
    tap()
    ensure(lv)
    setBank(lv)
    setSearch('')
    setShowCount(100)
    setMode('list')
    setQuiz(null)
  }

  const startQuiz = () => {
    tap()
    const pool = words.length ? words : filtered
    const base = filtered.length ? filtered : pool
    if (!base.length) {
      setQuiz(null)
      return
    }
    const picked = shuffle(base.slice(0, 40))
    const items = picked.map((w) => {
      const distractors = shuffle(words.filter((x) => x.zh !== w.zh).map((x) => x.zh)).slice(0, 3)
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
  }

  const nextQ = () => {
    if (!quiz) return
    tap()
    if (quiz.idx + 1 >= quiz.items.length) setQuiz({ ...quiz, done: true })
    else setQuiz({ ...quiz, idx: quiz.idx + 1, answered: false, picked: null })
  }

  const nextCard = () => {
    if (idx + 1 >= filtered.length) {
      setMode('list')
      setIdx(0)
      setFlipped(false)
      return
    }
    setIdx((i) => i + 1)
    setFlipped(false)
  }

  return (
    <>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={goHome}>
          ← 単語帳首页
        </button>
        <h2>
          📖 JLPT 全词库
          <small>真题词库全量浏览 · 搜索 / 卡片 / 测试</small>
        </h2>
      </div>

      <div className="word-level-filter" role="tablist" aria-label="词库级别">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            role="tab"
            aria-selected={bank === lv}
            className={bank === lv ? 'active' : ''}
            onClick={() => changeBank(lv)}
          >
            {lv}
            <span className="wl-bank-count">{LIB_TOTAL[lv]}</span>
          </button>
        ))}
      </div>

      <div className="word-search">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowCount(100)
          }}
          placeholder={`在 ${bank} 中搜索（假名/汉字/中文）`}
          aria-label="搜索单词"
        />
        {search && (
          <button className="mini-mark" onClick={() => setSearch('')} title="清空搜索">
            ✕
          </button>
        )}
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
              tap()
              setMode(m.id)
              if (m.id === 'quiz') startQuiz()
              if (m.id === 'cards') {
                setIdx(0)
                setFlipped(false)
              }
            }}
          >
            {m.label}
          </button>
        ))}
        <span className="wl-count">
          匹配 {filtered.length} 词{search ? `（${bank}）` : ''}
        </span>
      </div>

      {mode === 'list' && (
        <div className="word-list">
          {visible.map((w) => {
            const mastered = masteredAnywhere(learned, w.ja)
            return (
              <div key={w.ja} className={`word-row ${mastered ? 'learned' : ''}`}>
                <div className="word-main">
                  <span className="word-ja">{w.ja}</span>
                  {w.kana && <span className="word-kana">{w.kana}</span>}
                </div>
                <LevelBadge level={w.level} />
                <span className="word-zh">{w.zh}</span>
                <WordSpeech text={w.ja} />
                {mastered && (
                  <span className="mini-mark on" title="已在场景中掌握">
                    ✅
                  </span>
                )}
              </div>
            )
          })}
          {!visible.length && (
            <EmptyHint text={search ? '没有匹配的单词，换个关键词。' : '加载中…'} />
          )}
        </div>
      )}

      {mode === 'list' && visible.length < filtered.length && (
        <div className="load-more-row">
          <button className="btn btn-ghost" onClick={() => setShowCount((n) => n + 100)}>
            加载更多（{filtered.length - visible.length} 剩余）
          </button>
        </div>
      )}

      {mode === 'cards' && (
        <div className="card-study">
          {filtered.length ? (
            <>
              {filtered.length > 300 && (
                <p className="word-hint">词数较多，建议先用搜索缩小范围。</p>
              )}
              <div className="flashcard" onClick={() => setFlipped((v) => !v)}>
                <div className={`fc-inner ${flipped ? 'flipped' : ''}`}>
                  <div className="fc-face fc-front">
                    <div className="fc-ja">{filtered[idx].ja}</div>
                    {filtered[idx].kana && <div className="fc-kana">{filtered[idx].kana}</div>}
                    <WordSpeech text={filtered[idx].ja} />
                    <span className={`word-level lv-${filtered[idx].level}`}>
                      {filtered[idx].level}
                    </span>
                    <div className="fc-hint">点击卡片看中文</div>
                  </div>
                  <div className="fc-face fc-back">
                    <div className="fc-zh">{filtered[idx].zh}</div>
                    {filtered[idx].exJa && (
                      <div className="fc-ex">
                        <div className="fc-ex-ja">{filtered[idx].exJa}</div>
                        <div className="fc-ex-zh">{filtered[idx].exZh}</div>
                      </div>
                    )}
                    <div className="fc-hint">点击卡片回正面</div>
                  </div>
                </div>
              </div>
              <div className="fc-actions">
                <button className="btn btn-ghost" onClick={() => nextCard()}>
                  ⏭ 跳过
                </button>
                <button className="btn btn-primary" onClick={() => nextCard()}>
                  下一张 →
                </button>
              </div>
              <div className="fc-progress">
                {idx + 1} / {filtered.length}
              </div>
            </>
          ) : (
            <EmptyHint text="当前没有单词，换个级别或搜索条件。" />
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
                  {quiz.items[quiz.idx].w.kana && (
                    <span className="quiz-kana">{quiz.items[quiz.idx].w.kana}</span>
                  )}
                  <WordSpeech text={quiz.items[quiz.idx].w.ja} />
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
    </>
  )
}