import { useEffect, useMemo, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import { speakSequence, cancelSequence, getSpeechPrefs } from '../utils/speech.js'

export default function SentenceBank({ lang = 'en' }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState({})
  const [playing, setPlaying] = useState(null)
  const [playingIdx, setPlayingIdx] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(import.meta.env.BASE_URL + 'life-english.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
      cancelSequence()
    }
  }, [])

  const filtered = useMemo(() => {
    if (!data) return null
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data
      .map((sec) => {
        const sents = sec.sentences.filter(
          (s) =>
            s.zh.toLowerCase().includes(q) ||
            s.en.toLowerCase().includes(q) ||
            (sec.subs || []).some((x) => x.toLowerCase().includes(q)),
        )
        return sents.length ? { ...sec, sentences: sents } : null
      })
      .filter(Boolean)
  }, [data, query])

  const total = data ? data.reduce((n, s) => n + s.sentences.length, 0) : 0
  const searching = query.trim() !== ''

  const toggleSec = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))
  const openAll = () => data && setOpen(Object.fromEntries(data.map((s) => [s.id, true])))
  const closeAll = () => setOpen({})

  const playSection = async (sec) => {
    if (playing === sec.id) {
      cancelSequence()
      setPlaying(null)
      setPlayingIdx(null)
      return
    }
    setPlaying(sec.id)
    setPlayingIdx(0)
    setOpen((o) => ({ ...o, [sec.id]: true }))
    const { rate } = getSpeechPrefs()
    try {
      await speakSequence(sec.sentences.map((s) => s.en), {
        rate,
        onProgress: (i) => setPlayingIdx(i),
      })
    } finally {
      setPlaying(null)
      setPlayingIdx(null)
    }
  }

  return (
    <section className="sentence-bank">
      <h2 className="section-title">生活美語 · 英語口語8000句</h2>
      <p className="section-sub">
        {data
          ? `完整收录 39 节共 ${total} 个中英对照句子，可逐句朗读、整节连读或搜索定位。`
          : '从参考教材「生活美語」整理的常用英语口语句型，中英对照。'}
      </p>

      <div className="bank-toolbar">
        <input
          className="search bank-search"
          placeholder="🔍 搜索：中文 / 英文 / 小节（例：really、預訂、機場）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {data && (
          <div className="bank-actions">
            <button className="chip" onClick={openAll}>
              全部展开
            </button>
            <button className="chip" onClick={closeAll}>
              全部收起
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="empty">
          <div className="icon">⚠️</div>
          <p>句子数据载入失败，请检查网络后重试。</p>
        </div>
      )}

      {!error && !data && (
        <div className="empty">
          <div className="icon">⏳</div>
          <p>正在载入句子库…</p>
        </div>
      )}

      {data && filtered.length === 0 && (
        <div className="empty">
          <div className="icon">🔍</div>
          <p>没有找到匹配的句子，换个关键词试试吧。</p>
        </div>
      )}

      {filtered?.map((sec) => {
        const isOpen = searching || !!open[sec.id]
        const groups = []
        let curLabel = null
        let cur = null
        for (const s of sec.sentences) {
          const label = s.sub || ''
          if (label !== curLabel) {
            curLabel = label
            cur = { label, items: [] }
            groups.push(cur)
          }
          cur.items.push(s)
        }
        const secPlaying = playing === sec.id
        return (
          <article key={sec.id} className={`sentence-section ${isOpen ? 'open' : ''}`}>
            <div className="sentence-sec-head">
              <button className="sentence-sec-toggle" onClick={() => toggleSec(sec.id)} aria-expanded={isOpen}>
                <span className="sec-id">#{String(sec.id).padStart(2, '0')}</span>
                <span className="sec-title">{sec.title}</span>
                <span className="sentence-count">{sec.sentences.length}</span>
                <span className="sec-caret">{isOpen ? '▾' : '▸'}</span>
              </button>
              <button
                className={`sec-play ${secPlaying ? 'active' : ''}`}
                onClick={() => playSection(sec)}
                title={secPlaying ? '停止朗读本节的全部句子' : '依次朗读本节的全部句子'}
              >
                {secPlaying ? '⏹ 停止' : '▶ 連読'}
              </button>
            </div>

            {isOpen && (
              <div className="sentence-sec-body">
                {sec.subs?.length > 0 && (
                  <div className="sentence-sub-list">
                    {sec.subs.map((sub, i) => (
                      <span key={`${sub}-${i}`} className="sentence-sub-tag">
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
                {groups.map((g, gi) => (
                  <div key={gi} className="sentence-group">
                    {g.label && <h4 className="sentence-group-title">{g.label}</h4>}
                    {g.items.map((s, si) => {
                      const absIdx = sec.sentences.indexOf(s)
                      const isCur = secPlaying && playingIdx === absIdx
                      return (
                        <div key={`${gi}-${si}`} className={`sentence-row ${isCur ? 'playing' : ''}`}>
                          <div className="sentence-text">
                            <span className="sentence-zh">{s.zh}</span>
                            <span className="sentence-en">{s.en}</span>
                          </div>
                          <SpeechPlayer mini text={s.en} lang={lang} />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
