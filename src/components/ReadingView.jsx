import { useEffect, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import { loadReading, loadEssayTemplates } from '../utils/reading.js'
import { tap, success } from '../utils/haptics.js'

const LEVELS = [
  { id: 'all', label: '全部' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
]

function useLoad(fn) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let alive = true
    fn()
      .then((d) => alive && setData(d))
      .catch(() => alive && setErr(true))
    return () => {
      alive = false
    }
  }, [fn])
  return { data, err }
}

function copyText(text, label) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(success).catch(() => tap())
  if (label) window.confirm(`${label}已复制到剪贴板`)
}

export default function ReadingView() {
  const [view, setView] = useState('home')
  const [active, setActive] = useState(null)

  const go = (v) => {
    tap()
    setView(v)
  }

  const back = () => {
    tap()
    setActive(null)
  }

  if (view === 'home') {
    return (
      <section>
        <h2 className="section-title">読解・作文</h2>
        <p className="section-sub">
          JLPT N4–N2 阅读训练 + 常见考试作文模板，学完即练。
        </p>
        <div className="word-entry-grid">
          <button className="word-entry-card" onClick={() => go('reading')}>
            <span className="we-emoji">📖</span>
            <span className="we-title">
              読解トレーニング
              <small>N4–N2 分级阅读 · 全文朗读 · 理解题</small>
            </span>
            <span className="we-count">阅读文章</span>
          </button>
          <button className="word-entry-card" onClick={() => go('essay')}>
            <span className="we-emoji">✍️</span>
            <span className="we-title">
              作文テンプレート
              <small>观点 · 理由 · 经验 · 书信 · 图表 · 计划</small>
            </span>
            <span className="we-count">考试模板</span>
          </button>
        </div>
      </section>
    )
  }

  if (view === 'reading') {
    if (active) return <ReadingDetail article={active} goBack={back} />
    return (
      <ReadingArea
        goHome={() => setView('home')}
        onPick={(r) => {
          tap()
          setActive(r)
        }}
      />
    )
  }

  if (active) return <EssayDetail template={active} goBack={back} />
  return (
    <EssayArea
      goHome={() => setView('home')}
      onPick={(t) => {
        tap()
        setActive(t)
      }}
    />
  )
}

function LoadingHead({ goHome, title }) {
  return (
    <>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={goHome}>
          ← 返回
        </button>
        <h2>{title}</h2>
      </div>
      <p className="section-sub">加载中…</p>
    </>
  )
}

function ReadingArea({ goHome, onPick }) {
  const { data, err } = useLoad(loadReading)
  const [level, setLevel] = useState('all')

  if (err) return <p className="section-sub">阅读内容加载失败，请检查网络后重试。</p>
  if (!data) return <LoadingHead goHome={goHome} title="📖 読解トレーニング" />

  const list = level === 'all' ? data : data.filter((r) => r.level === level)

  return (
    <>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={goHome}>
          ← 返回
        </button>
        <h2>📖 読解トレーニング</h2>
      </div>

      <div className="word-level-filter" role="tablist" aria-label="阅读级别">
        {LEVELS.map((lv) => (
          <button
            key={lv.id}
            role="tab"
            aria-selected={level === lv.id}
            className={level === lv.id ? 'active' : ''}
            onClick={() => {
              tap()
              setLevel(lv.id)
            }}
          >
            {lv.label}
            <span className="wl-bank-count">
              {lv.id === 'all' ? data.length : data.filter((r) => r.level === lv.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="reading-list">
        {list.map((r) => (
          <button key={r.id} className="reading-card" onClick={() => onPick(r)}>
            <span className={`word-level lv-${r.level}`}>{r.level}</span>
            <span className="reading-card-title">
              {r.title}
              <small>{r.titleZh}</small>
            </span>
            <span className="reading-card-cat">{r.category}</span>
            <span className="reading-card-arrow">→</span>
          </button>
        ))}
        {!list.length && <p className="section-sub">该级别暂无文章。</p>}
      </div>
    </>
  )
}

function EssayArea({ goHome, onPick }) {
  const { data, err } = useLoad(loadEssayTemplates)

  if (err) return <p className="section-sub">作文模板加载失败，请检查网络后重试。</p>
  if (!data) return <LoadingHead goHome={goHome} title="✍️ 作文テンプレート" />

  return (
    <>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={goHome}>
          ← 返回
        </button>
        <h2>✍️ 作文テンプレート</h2>
      </div>

      <div className="reading-list">
        {data.map((t) => (
          <button key={t.id} className="reading-card essay-card" onClick={() => onPick(t)}>
            <span className="essay-card-emoji">{t.emoji}</span>
            <span className="reading-card-title">
              {t.title}
              <small>
                {t.titleZh} · {t.type}
              </small>
            </span>
            <span className="reading-card-arrow">→</span>
          </button>
        ))}
      </div>
    </>
  )
}

function ReadingDetail({ article, goBack }) {
  const [showZh, setShowZh] = useState(false)
  const [openQ, setOpenQ] = useState({})

  return (
    <>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={goBack}>
          ← 文章列表
        </button>
        <h2>
          {article.title}
          <small>
            {article.titleZh} · <span className={`word-level lv-${article.level}`}>{article.level}</span>
          </small>
        </h2>
      </div>

      <div className="reading-article">
        <div className="reading-article-actions">
          <button
            className={`btn ${showZh ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              tap()
              setShowZh((v) => !v)
            }}
          >
            {showZh ? '🇯🇵 日本語' : '🇨🇳 中文訳'}
          </button>
        </div>

        <p className={`reading-text ${showZh ? 'reading-text-zh' : ''}`}>
          {showZh ? article.zh : article.ja}
        </p>
        {!showZh && (
          <div className="reading-listen">
            <SpeechPlayer text={article.ja} lang="ja" />
            <span>全文朗读</span>
          </div>
        )}
      </div>

      <div className="reading-section">
        <h3 className="reading-section-title">📚 重要単語</h3>
        <div className="reading-words">
          {article.words.map((w) => (
            <div key={w.ja} className="reading-word">
              <span className="reading-word-ja">{w.ja}</span>
              {w.kana && <span className="reading-word-kana">{w.kana}</span>}
              <span className="reading-word-zh">{w.zh}</span>
            </div>
          ))}
        </div>
      </div>

      {article.questions && (
        <div className="reading-section">
          <h3 className="reading-section-title">📝 読解チェック</h3>
          <div className="reading-questions">
            {article.questions.map((q, i) => (
              <div key={i} className="reading-question">
                <div className="reading-q-head">
                  <span className="reading-q-ja">{q.ja}</span>
                  <span className="reading-q-zh">{q.zh}</span>
                  <button
                    className="mini-mark"
                    onClick={() => {
                      tap()
                      setOpenQ((o) => ({ ...o, [i]: !o[i] }))
                    }}
                    title={openQ[i] ? '隐藏答案' : '查看答案'}
                  >
                    {openQ[i] ? '✕' : '🔍'}
                  </button>
                </div>
                {openQ[i] && <div className="reading-q-answer">💡 {q.a}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function EssayDetail({ template, goBack }) {
  const sampleText = `${template.title}\n\n${template.sample}`

  return (
    <>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={goBack}>
          ← 模板列表
        </button>
        <h2>
          {template.emoji} {template.title}
          <small>{template.titleZh}</small>
        </h2>
      </div>

      <div className="essay-desc">
        <p className="essay-desc-ja">{template.desc}</p>
        <p className="essay-desc-zh">{template.descZh}</p>
      </div>

      <div className="reading-section">
        <h3 className="reading-section-title">📐 文章構成</h3>
        <ol className="essay-structure">
          {template.structure.map((s, i) => (
            <li key={i}>
              <span className="essay-st-ja">{s.ja}</span>
              <span className="essay-st-zh">{s.zh}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="reading-section">
        <h3 className="reading-section-title">💬 使える表現</h3>
        <div className="essay-patterns">
          {template.patterns.map((p, i) => (
            <div key={i} className="essay-pattern">
              <div className="essay-pattern-ja">
                {p.ja}
                <button
                  className="mini-mark"
                  onClick={() => copyText(p.ja, '句型')}
                  title="复制句型"
                >
                  📋
                </button>
              </div>
              <div className="essay-pattern-zh">{p.zh}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="reading-section">
        <h3 className="reading-section-title">📄 例文</h3>
        <div className="essay-sample">
          <p className="essay-sample-ja">{template.sample}</p>
          <p className="essay-sample-zh">{template.sampleZh}</p>
        </div>
        <button className="btn btn-primary" onClick={() => copyText(sampleText, '例文')}>
          📋 复制范文
        </button>
      </div>
    </>
  )
}
