import { useEffect, useState } from 'react'
import { CATEGORIES, LEVELS, topicLevel } from '../data/topics.js'
import { EN_CATEGORIES, EN_LEVELS, enTopicLevel } from '../data/english.js'
import SpeechPlayer from './SpeechPlayer.jsx'
import { loadEnglishSentences, searchSentences, findSpan } from '../utils/sentences.js'

function Marked({ text, q }) {
  if (!text || !q) return text
  const span = findSpan(text, q)
  if (!span) return text
  return (
    <>
      {text.slice(0, span.start)}
      <mark>{text.slice(span.start, span.end)}</mark>
      {text.slice(span.end)}
    </>
  )
}

export default function TopicBrowser({
  allTopics,
  currentId,
  states,
  onToggleState,
  onPick,
  query,
  onQueryChange,
  lang = 'ja',
}) {
  const topics = allTopics ?? []
  const [cat, setCat] = useState('all')
  const [showLearned, setShowLearned] = useState('all')
  const [sent, setSent] = useState(null)
  const [sentErr, setSentErr] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const isEn = lang === 'en'
  const CATS = isEn ? EN_CATEGORIES : CATEGORIES
  const LVLS = isEn ? EN_LEVELS : LEVELS
  const levelOf = isEn ? enTopicLevel : topicLevel
  const q = (query ?? '').trim().toLowerCase()

  useEffect(() => {
    if (!q) {
      setSent(null)
      setSentErr(false)
      return
    }
    let alive = true
    loadEnglishSentences()
      .then((d) => alive && setSent(d))
      .catch(() => alive && setSentErr(true))
    return () => {
      alive = false
    }
  }, [q])

  const sentResults = sent ? searchSentences(sent, query) : []

  const filtered = topics.filter((t) => {
    const isLevel = LVLS.some((l) => l.id === cat)
    const okCat = q
      ? true
      : cat === 'all'
        ? t.category !== 'interview'
        : isLevel
          ? levelOf(t.category) === cat
          : t.category === cat
    const st = states?.[t.id]
    const okLearned =
      showLearned === 'all' ||
      (showLearned === 'mastered' && st?.mastered) ||
      (showLearned === 'fav' && st?.fav)
    const okQuery =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.titleZh.includes(q) ||
      (t.keywords || []).some((k) => k.toLowerCase().includes(q)) ||
      (t.expressions || []).some((e) => e.toLowerCase().includes(q))
    return okCat && okLearned && okQuery
  })

  const levelChips = LVLS.filter((l) => l.id !== 'interview')

  return (
    <section>
      <h2 className="section-title">{isEn ? 'English Topics' : '話題カード一覧'}</h2>
      <p className="section-sub">
        {isEn
          ? `共 ${topics.length} 个生活英语场景，点击卡片开始练习。关键词与句型帮你连续开口说。`
          : `共 ${topics.length} 个话题（含 37 个面接问题），点击卡片开始练习。关键词与句型帮你连续开口说。`}
      </p>

      <div className="filters">
        <button className={`chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
          {isEn ? 'All' : 'すべて'}
        </button>
        {CATS.map((c) => (
          <button
            key={c.id}
            className={`chip ${cat === c.id ? 'active' : ''}`}
            onClick={() => setCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="filters" style={{ marginTop: -8 }}>
        {!isEn && (
          <button className={`chip ${cat === 'interview' ? 'active' : ''}`} onClick={() => setCat('interview')}>
            🎤 面接対策 ({topics.filter((t) => t.category === 'interview').length})
          </button>
        )}
        {levelChips.map((l) => (
          <button
            key={l.id}
            className={`chip ${cat === l.id ? 'active' : ''}`}
            onClick={() => setCat(l.id)}
            title={`难度：${l.label}`}
          >
            {l.short}
          </button>
        ))}
        <span className="filter-divider" />
        <button
          className={`chip ${showLearned === 'all' ? 'active' : ''}`}
          onClick={() => setShowLearned('all')}
        >
          すべて
        </button>
        <button
          className={`chip ${showLearned === 'mastered' ? 'active' : ''}`}
          onClick={() => setShowLearned('mastered')}
        >
          ✅ 已掌握
        </button>
        <button
          className={`chip ${showLearned === 'fav' ? 'active' : ''}`}
          onClick={() => setShowLearned('fav')}
        >
          ⭐ 收藏
        </button>
      </div>

      <div className="search-wrap">
        <input
          className="search"
          placeholder={isEn ? '🔍 検索：话题名 / 关键词（例：travel、movie）' : '検索：话题名 / 关键词（例：旅行、ラーメン）'}
          value={query ?? ''}
          onChange={(e) => onQueryChange?.(e.target.value)}
        />
        {q && (
          <button className="search-clear" onClick={() => onQueryChange?.('')} aria-label="清除搜索">
            ✕
          </button>
        )}
      </div>

      {q ? (
        <>
          {filtered.length > 0 && (
            <div className="search-results">
              <h3 className="search-res-group">话题匹配 · {filtered.length}</h3>
              <div className="grid">
                {filtered.map((t) => {
                  const st = states?.[t.id]
                  const level = LVLS.find((l) => l.id === levelOf(t.category))
                  return (
                    <div key={t.id} className={`topic-card-wrap ${t.id === currentId ? 'active' : ''}`}>
                      <div className="topic-card-marks">
                        {st?.mastered && <span className="mark mastered">✅</span>}
                        {st?.fav && <span className="mark fav">⭐</span>}
                      </div>
                      <button
                        className={`topic-card ${t.id === currentId ? 'topic-active' : ''}`}
                        onClick={() => onPick(t)}
                      >
                        <span className="emoji">{t.emoji}</span>
                        <span className="cat">
                          {CATS.find((c) => c.id === t.category)?.label ?? ''}
                          <em className={`level-badge lv-${level?.id}`}>{level?.short}</em>
                        </span>
                        <h3>
                          <Marked text={t.title} q={query} />
                          <small>
                            <Marked text={t.titleZh} q={query} />
                          </small>
                        </h3>
                        <div className="kw">
                          {(t.keywords || []).slice(0, 4).map((k) => (
                            <span key={k}>
                              <Marked text={k} q={query} />
                            </span>
                          ))}
                        </div>
                      </button>
                      <div className="topic-card-actions">
                        <button
                          className={`mini-mark ${st?.fav ? 'on' : ''}`}
                          onClick={() => onToggleState(t.id, 'fav')}
                          title="收藏"
                        >
                          ⭐
                        </button>
                        <button
                          className={`mini-mark ${st?.mastered ? 'on' : ''}`}
                          onClick={() => onToggleState(t.id, 'mastered')}
                          title="标记已掌握"
                        >
                          ✅
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!sent && !sentErr && q && <div className="skeleton-list" aria-label="搜索句子中">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>}
          {sentErr && (
            <div className="empty">
              <div className="icon">⚠️</div>
              <p>句子数据载入失败，请检查网络后重试。</p>
            </div>
          )}
          {sentResults.length > 0 && (
            <div className="search-results">
              <h3 className="search-res-group">句子匹配 · {sentResults.length}</h3>
              <div className="sentence-res-list">
                {(showAll ? sentResults : sentResults.slice(0, 40)).map((s, i) => (
                  <div key={`${s.secId}-${i}`} className="sentence-row">
                    <div className="sentence-text">
                      <span className="sentence-zh">
                        <Marked text={s.zh} q={query} />
                      </span>
                      <span className="sentence-en">
                        <Marked text={s.en} q={query} />
                      </span>
                      {s.secTitle && <em className="sentence-sec-tag">{s.secTitle}</em>}
                    </div>
                    <SpeechPlayer mini text={s.en} lang={lang} />
                  </div>
                ))}
              </div>
              {sentResults.length > 40 && (
                <button className="search-more-btn" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? '收起' : `显示全部 ${sentResults.length} 条`}
                </button>
              )}
            </div>
          )}

          {filtered.length === 0 && sentResults.length === 0 && !sent && !sentErr && null}
          {filtered.length === 0 && sentResults.length === 0 && (sentErr || sent) && (
            <div className="empty">
              <div className="icon">🔍</div>
              <p>没有找到「{query}」相关的内容，换个关键词试试吧。</p>
            </div>
          )}
        </>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="icon">🔍</div>
          <p>没有找到相关话题，换个关键词试试吧。</p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((t) => {
            const st = states?.[t.id]
            const level = LVLS.find((l) => l.id === levelOf(t.category))
            return (
              <div key={t.id} className={`topic-card-wrap ${t.id === currentId ? 'active' : ''}`}>
                <div className="topic-card-marks">
                  {st?.mastered && <span className="mark mastered">✅</span>}
                  {st?.fav && <span className="mark fav">⭐</span>}
                </div>
                <button
                  className={`topic-card ${t.id === currentId ? 'topic-active' : ''}`}
                  onClick={() => onPick(t)}
                >
                  <span className="emoji">{t.emoji}</span>
                  <span className="cat">
                    {CATS.find((c) => c.id === t.category)?.label ?? ''}
                    <em className={`level-badge lv-${level?.id}`}>{level?.short}</em>
                  </span>
                  <h3>
                    {t.title}
                    <small>{t.titleZh}</small>
                  </h3>
                  <div className="kw">
                    {(t.keywords || []).slice(0, 4).map((k) => (
                      <span key={k}>{k}</span>
                    ))}
                  </div>
                </button>
                <div className="topic-card-actions">
                  <button
                    className={`mini-mark ${st?.fav ? 'on' : ''}`}
                    onClick={() => onToggleState(t.id, 'fav')}
                    title="收藏"
                  >
                    ⭐
                  </button>
                  <button
                    className={`mini-mark ${st?.mastered ? 'on' : ''}`}
                    onClick={() => onToggleState(t.id, 'mastered')}
                    title="标记已掌握"
                  >
                    ✅
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
