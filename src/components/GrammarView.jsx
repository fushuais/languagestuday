import { useEffect, useState } from 'react'
import SpeechPlayer from './SpeechPlayer.jsx'
import { loadGrammar } from '../utils/vocab.js'
import { speakText, stopSpeech, getSpeechPrefs, setSpeechLang } from '../utils/speech.js'
import { tap } from '../utils/haptics.js'

const LEVELS = [
  { id: 'all', label: '全部' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
]

export default function GrammarView() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  const [level, setLevel] = useState('all')
  const [active, setActive] = useState(null)

  useEffect(() => {
    let alive = true
    loadGrammar()
      .then((d) => alive && setData(d))
      .catch(() => alive && setErr(true))
    return () => {
      alive = false
    }
  }, [])

  const back = () => {
    tap()
    setActive(null)
  }

  if (err) return <p className="section-sub">文法内容加载失败，请检查网络后重试。</p>
  if (!data) return <p className="section-sub">文法加载中…</p>

  const list = level === 'all' ? data : data.filter((g) => g.level === level)

  if (active) return <GrammarDetail item={active} goBack={back} />

  return (
    <section>
      <h2 className="section-title">文法</h2>
      <p className="section-sub">JLPT N4–N2 核心语法分级整理，每个语法点配多个例句详解，点击可朗读。</p>

      <div className="word-level-filter" role="tablist" aria-label="文法级别">
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
              {lv.id === 'all' ? data.length : data.filter((g) => g.level === lv.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grammar-list">
        {list.map((g) => (
          <button key={g.id} className="grammar-card" onClick={() => { tap(); setActive(g) }}>
            <span className={`word-level lv-${g.level}`}>{g.level}</span>
            <span className="grammar-card-main">
              <span className="grammar-card-pattern">{g.pattern}</span>
              <small className="grammar-card-meaning">{g.meaning}</small>
            </span>
            <span className="grammar-card-arrow">→</span>
          </button>
        ))}
        {!list.length && <p className="section-sub">该级别暂无语法点。</p>}
      </div>
    </section>
  )
}

function GrammarDetail({ item, goBack }) {
  const [speakingIdx, setSpeakingIdx] = useState(null)

  const speakSentence = (idx) => {
    tap()
    if (speakingIdx === idx) {
      stopSpeech()
      setSpeakingIdx(null)
      return
    }
    setSpeechLang('ja')
    speakText(item.examples[idx].ja, {
      rate: getSpeechPrefs().rate,
      onEnd: () => setSpeakingIdx(null),
    })
    setSpeakingIdx(idx)
  }

  useEffect(() => () => stopSpeech(), [])

  return (
    <section>
      <div className="word-scene-head">
        <button className="btn btn-ghost" onClick={goBack}>
          ← 文法列表
        </button>
        <h2>
          {item.pattern}
          <small>
            {item.meaning} · <span className={`word-level lv-${item.level}`}>{item.level}</span>
          </small>
        </h2>
      </div>

      <div className="grammar-usage">
        <p className="grammar-usage-ja">{item.usage}</p>
      </div>

      <div className="reading-section">
        <h3 className="reading-section-title">📖 例文</h3>
        <div className="grammar-examples">
          {item.examples.map((ex, i) => (
            <button
              key={i}
              className={`grammar-example ${speakingIdx === i ? 'speaking' : ''}`}
              onClick={() => speakSentence(i)}
            >
              <span className="grammar-ex-ja">{ex.ja}</span>
              <span className="grammar-ex-zh">{ex.zh}</span>
            </button>
          ))}
        </div>
        <div className="reading-listen">
          <SpeechPlayer text={item.examples.map((e) => e.ja).join(' ')} />
          <span>朗读全部例句</span>
        </div>
      </div>
    </section>
  )
}