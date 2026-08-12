import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import ReadingView from './ReadingView.jsx'
import GrammarView from './GrammarView.jsx'
import { loadLevel, loadChapters, masteredAnywhere, maxLevelAnywhere } from '../utils/vocab.js'
import { tap, success } from '../utils/haptics.js'

const LEVELS = ['N5', 'N4', 'N3', 'N2']
const LIB_TOTAL = { N5: 794, N4: 750, N3: 1796, N2: 3192 }

const LV_LABELS = ['未学', '认识', '熟悉', '已掌握']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const LevelBadge = ({ level }) => <span className={`word-level lv-${level}`}>{level}</span>

const MasteryDots = ({ level }) => (
  <span className="mastery-dots" title={`熟悉程度：${LV_LABELS[level] || '未学'}`} aria-label={`熟悉程度 ${LV_LABELS[level] || '未学'}`}>
    {[1, 2, 3].map((i) => (
      <span key={i} className={`mdot ${level >= i ? 'on' : ''}`} />
    ))}
  </span>
)

const EmptyHint = ({ text }) => (
  <div className="quiz-result">
    <p>{text}</p>
  </div>
)

const WordSpeech = ({ text }) => <SpeechPlayer mini text={text} lang="ja" />

const SentenceBox = ({ w }) =>
  w.exJa ? (
    <div className="word-sentence">
      <div className="ws-ja">
        <WordSpeech text={w.exJa} />
        <span>{w.exJa}</span>
      </div>
      {w.exZh && <div className="ws-zh">{w.exZh}</div>}
    </div>
  ) : null

export default function WordsView({ learned, onBumpWord }) {
  const [view, setView] = useState('home')

  const go = (v) => {
    tap()
    setView(v)
  }

  if (view === 'home') {
    const libTotal = LEVELS.reduce((n, l) => n + LIB_TOTAL[l], 0)
    return (
      <section>
        <h2 className="section-title">単語・読解</h2>
        <p className="section-sub">
          海量 JLPT 词库（N5–N2）按级别全量收录，可分等级学习文法、全词库浏览复习；附 N4–N2 阅读与考试作文模板。
        </p>
        <div className="word-entry-grid">
          <button className="word-entry-card" onClick={() => go('grammar')}>
            <span className="we-emoji">📐</span>
            <span className="we-title">
              文法
              <small>N4–N2 分级核心语法 · 多例句详解</small>
            </span>
            <span className="we-count">语法点</span>
          </button>
          <button className="word-entry-card" onClick={() => go('library')}>
            <span className="we-emoji">📖</span>
            <span className="we-title">
              JLPT 全词库
              <small>N5–N2 全量真题词库</small>
            </span>
            <span className="we-count">{libTotal} 词</span>
          </button>
          <button className="word-entry-card" onClick={() => go('reading')}>
            <span className="we-emoji">🗞️</span>
            <span className="we-title">
              読解・作文
              <small>N4–N2 阅读文章 · 考试作文模板</small>
            </span>
            <span className="we-count">阅读 + 写作</span>
          </button>
        </div>
        <p className="word-source">
          词库来源：开源 JLPT 牌组 tcf245（eggrolls-JLPT10k v3.5）· CC BY-NC 4.0
        </p>
      </section>
    )
  }

  if (view === 'library') return <LibraryArea learned={learned} onBumpWord={onBumpWord} goHome={() => go('home')} />

  if (view === 'reading') return <ReadingView />

  return <GrammarView goHome={() => go('home')} />
}

function LibraryArea({ learned, onBumpWord, goHome }) {
  const [bank, setBank] = useState('N5')
  const [banks, setBanks] = useState({})
  const [chapters, setChapters] = useState([])
  const [chapter, setChapter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(100)
  const [mode, setMode] = useState('list')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const aliveRef = useRef(true)
  useEffect(() => () => {
    aliveRef.current = false
  }, [])

  const words = useMemo(() => banks[bank] || [], [banks, bank])
  const chapterMap = useMemo(() => Object.fromEntries(chapters.map((c) => [c.id, c])), [chapters])

  useEffect(() => {
    let alive = true
    loadChapters()
      .then((d) => alive && setChapters(d))
      .catch(() => alive && setChapters([]))
    return () => {
      alive = false
    }
  }, [])

  const ensure = useCallback((lv) => {
    if (banks[lv]) return Promise.resolve(banks[lv])
    return loadLevel(lv)
      .then((d) => {
        if (aliveRef.current) setBanks((b) => ({ ...b, [lv]: d }))
        return d
      })
      .catch(() => {
        if (aliveRef.current) setBanks((b) => ({ ...b, [lv]: [] }))
        return []
      })
  }, [banks])

  useEffect(() => {
    ensure(bank)
  }, [bank, ensure])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = words
    if (q) list = words.filter((w) => w.ja.includes(q) || (w.kana && w.kana.includes(q)) || w.zh.includes(q))
    if (chapter !== 'all') list = list.filter((w) => (w.scene || 'other') === chapter)
    return list
  }, [words, search, chapter])

  const visible = filtered.slice(0, showCount)

  const chapterCounts = useMemo(() => {
    const counts = new Map()
    for (const w of words) {
      const id = w.scene || 'other'
      counts.set(id, (counts.get(id) || 0) + 1)
    }
    return counts
  }, [words])

  const changeBank = (lv) => {
    if (lv === bank) return
    tap()
    ensure(lv)
    setBank(lv)
    setSearch('')
    setShowCount(100)
    setMode('list')
    setChapter('all')
    setQuiz(null)
  }

  const changeChapter = (id) => {
    if (id === chapter) return
    tap()
    setChapter(id)
    setSearch('')
    setShowCount(100)
    setMode('list')
    setQuiz(null)
    setIdx(0)
    setFlipped(false)
  }

  const rowOf = (w) => {
    const mastered = masteredAnywhere(learned, w.ja)
    const lv = maxLevelAnywhere(learned, w.ja)
    return (
      <div key={w.ja} className={`word-row ${mastered ? 'learned' : ''}`}>
        <div className="word-main">
          <span className="word-ja">{w.ja}</span>
          {w.kana && <span className="word-kana">{w.kana}</span>}
        </div>
        <LevelBadge level={w.level} />
        <span className="word-zh">{w.zh}</span>
        <SentenceBox w={w} />
        <MasteryDots level={lv} />
        <WordSpeech text={w.ja} />
        {mastered && (
          <span className="mini-mark on" title="已掌握（熟悉度满级）">
            ✅
          </span>
        )}
      </div>
    )
  }

  const chapterHead = (id, count) => {
    const ch = chapterMap[id]
    return (
      <div className="word-chapter-head">
        <span className="wch-emoji">{ch ? ch.emoji : '⚪'}</span>
        <span className="wch-title">
          {ch ? ch.title : '其他'}
          <small>{ch ? ch.zh : '其他分类'}</small>
        </span>
        <span className="wch-count">{count}</span>
      </div>
    )
  }

  const listBody = () => {
    if (chapter !== 'all') {
      return (
        <>
          {chapterHead(chapter, filtered.length)}
          {visible.map(rowOf)}
        </>
      )
    }
    const byScene = {}
    for (const w of visible) {
      const id = w.scene || 'other'
      ;(byScene[id] = byScene[id] || []).push(w)
    }
    const order = chapters.map((c) => c.id).filter((id) => byScene[id])
    for (const id of Object.keys(byScene)) if (!order.includes(id)) order.push(id)
    return order.map((id) => (
      <div key={id}>
        {chapterHead(id, byScene[id].length)}
        {byScene[id].map(rowOf)}
      </div>
    ))
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
    if (correct) {
      success()
      onBumpWord(item.w.scene || 'other', item.w.ja, 1)
    } else {
      tap()
      onBumpWord(item.w.scene || 'other', item.w.ja, -1)
    }
  }

  const nextQ = () => {
    if (!quiz) return
    tap()
    if (quiz.idx + 1 >= quiz.items.length) setQuiz({ ...quiz, done: true })
    else setQuiz({ ...quiz, idx: quiz.idx + 1, answered: false, picked: null })
  }

  const nextCard = (known) => {
    if (!filtered[idx]) return
    if (known) onBumpWord(filtered[idx].scene || 'other', filtered[idx].ja, 1)
    else onBumpWord(filtered[idx].scene || 'other', filtered[idx].ja, -1)
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

      <div className="word-chapter-filter" role="tablist" aria-label="主题章节筛选">
        <button
          role="tab"
          aria-selected={chapter === 'all'}
          className={chapter === 'all' ? 'active' : ''}
          onClick={() => changeChapter('all')}
        >
          全部
          <span className="wch-badge">{words.length}</span>
        </button>
        {chapters.map((c) => {
          const n = chapterCounts.get(c.id) || 0
          if (!n) return null
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={chapter === c.id}
              className={chapter === c.id ? 'active' : ''}
              onClick={() => changeChapter(c.id)}
            >
              {c.emoji} {c.title}
              <span className="wch-badge">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="word-search">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowCount(100)
            if (mode === 'cards') {
              setIdx(0)
              setFlipped(false)
            }
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
          {listBody()}
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
            (() => {
              const activeWord = filtered.length ? filtered[Math.min(idx, filtered.length - 1)] : null
              return activeWord ? (
                <>
                  {filtered.length > 300 && (
                    <p className="word-hint">词数较多，建议先用搜索缩小范围。</p>
                  )}
                  <div className="flashcard" onClick={() => setFlipped((v) => !v)}>
                    <div className={`fc-inner ${flipped ? 'flipped' : ''}`}>
                      <div className="fc-face fc-front">
                        <div className="fc-ja">{activeWord.ja}</div>
                        {activeWord.kana && <div className="fc-kana">{activeWord.kana}</div>}
                        <WordSpeech text={activeWord.ja} />
                        <span className={`word-level lv-${activeWord.level}`}>
                          {activeWord.level}
                        </span>
                        <div className="fc-hint">点击卡片看中文</div>
                      </div>
                      <div className="fc-face fc-back">
                        <MasteryDots level={maxLevelAnywhere(learned, activeWord.ja)} />
                        <div className="fc-zh">{activeWord.zh}</div>
                        {activeWord.exJa && (
                          <div className="fc-ex">
                            <div className="fc-ex-ja">{activeWord.exJa}</div>
                            <div className="fc-ex-zh">{activeWord.exZh}</div>
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
                    {Math.min(idx, filtered.length - 1) + 1} / {filtered.length}
                  </div>
                </>
              ) : (
                <EmptyHint text="当前没有单词，换个级别或搜索条件。" />
              )
            })()
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