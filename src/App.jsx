import { CATEGORIES, TOPICS, LEVELS, topicLevel } from './data/topics.js'
import { EN_CATEGORIES, EN_TOPICS, EN_LEVELS, enTopicLevel } from './data/english.js'
import { INTERVIEW, interviewToTopic } from './data/interview.js'
import PracticeView from './components/PracticeView.jsx'
import TopicBrowser from './components/TopicBrowser.jsx'
import SentenceBank from './components/SentenceBank.jsx'
import SegmentedTabs from './components/SegmentedTabs.jsx'
import InterviewView from './components/InterviewView.jsx'
import HistoryView from './components/HistoryView.jsx'
import Onboarding, { shouldOnboard } from './components/Onboarding.jsx'
import EdgeStatusBadge from './components/EdgeStatusBadge.jsx'
import {
  loadHistory,
  saveHistory,
  loadOverrides,
  saveOverrides,
  loadTopicStates,
  saveTopicStates,
  loadGoal,
  saveGoal,
  loadLang,
  saveLang,
  loadTheme,
  saveTheme,
} from './utils/storage.js'
import { loadProfile, saveProfile } from './utils/profile.js'
import { setSpeechLang, stopSpeech } from './utils/speech.js'
import { tap, success } from './utils/haptics.js'
import { useEffect, useState } from 'react'

const JA_TOPICS = [...TOPICS, ...INTERVIEW.map(interviewToTopic)]
const ALL_BY_ID = Object.fromEntries([...JA_TOPICS, ...EN_TOPICS].map((t) => [t.id, t]))

const VIEWS_JA = [
  { id: 'practice', label: '連続練習' },
  { id: 'interview', label: '面接対策' },
  { id: 'topics', label: '話題カード' },
  { id: 'history', label: '練習記録' },
]

const VIEWS_EN = [
  { id: 'practice', label: 'Practice' },
  { id: 'topics', label: 'Topics' },
  { id: 'sentences', label: '生活美語' },
  { id: 'history', label: 'History' },
]

export default function App() {
  const [lang, setLang] = useState(loadLang)
  const [theme, setTheme] = useState(loadTheme)
  const [switching, setSwitching] = useState(false)
  const [view, setView] = useState('practice')
  const [topic, setTopic] = useState(() => (loadLang() === 'en' ? EN_TOPICS[0] : JA_TOPICS[0]))
  const [history, setHistory] = useState(loadHistory)
  const [profile, setProfile] = useState(loadProfile)
  const [overrides, setOverrides] = useState(loadOverrides)
  const [topicStates, setTopicStates] = useState(loadTopicStates)
  const [goal, setGoal] = useState(loadGoal)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnboard, setShowOnboard] = useState(() => shouldOnboard())
  const [practiceActive, setPracticeActive] = useState(false)

  const isEn = lang === 'en'
  const topicList = isEn ? EN_TOPICS : JA_TOPICS
  const CATS = isEn ? EN_CATEGORIES : CATEGORIES
  const LVLS = isEn ? EN_LEVELS : LEVELS
  const levelOf = isEn ? enTopicLevel : topicLevel
  const VIEWS = isEn ? VIEWS_EN : VIEWS_JA

  useEffect(() => {
    setSpeechLang(lang)
  }, [lang])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f2f6fa' : '#0f1720')
  }, [theme])

  const toggleTheme = () => {
    tap()
    const root = document.documentElement
    root.classList.add('theme-anim')
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    saveTheme(next)
    window.setTimeout(() => root.classList.remove('theme-anim'), 450)
  }

  const changeView = (next) => {
    if (next !== view && practiceActive) {
      const ok = window.confirm('練習中です。途中でやめて移動しますか？未記録の練習は失われます。')
      if (!ok) return
      setPracticeActive(false)
    }
    tap()
    setView(next)
  }

  const pickTopic = (t) => {
    tap()
    setTopic(t)
    setView('practice')
  }

  const nextTopic = () => {
    const idx = topicList.findIndex((t) => t.id === topic.id)
    const current = topicList[idx] ?? topicList[0]
    const cat = current.category
    for (let i = 1; i <= topicList.length; i++) {
      const cand = topicList[(idx + i) % topicList.length]
      if (cand.category !== cat) {
        setTopic(cand)
        return
      }
    }
    setTopic(topicList[(idx + 1) % topicList.length])
  }

  const switchLang = (next) => {
    if (next === lang || switching) return
    if (practiceActive) {
      const ok = window.confirm('練習中です。言語を切り替えますか？未記録の練習は失われます。')
      if (!ok) return
      setPracticeActive(false)
    }
    stopSpeech()
      setSwitching(true)
      window.setTimeout(() => {
        setLang(next)
        saveLang(next)
        setTopic(next === 'en' ? EN_TOPICS[0] : JA_TOPICS[0])
        setSearchQuery('')
        if (next === 'en' && view === 'interview') setView('practice')
        if (next === 'ja' && view === 'sentences') setView('practice')
        setSwitching(false)
      }, 300)
  }

  const startInterview = (item) => {
    tap()
    pickTopic(interviewToTopic(item))
  }

  const handleSaveProfile = (p) => {
    setProfile(p)
    saveProfile(p)
  }

  const handleSetOverride = (id, text) => {
    const next = { ...overrides }
    if (text === null || text.trim() === '') delete next[id]
    else next[id] = text.trim()
    setOverrides(next)
    saveOverrides(next)
  }

  const addRecord = (record) => {
    const next = [record, ...history].slice(0, 500)
    setHistory(next)
    saveHistory(next)
  }

  const clearHistory = () => {
    setHistory([])
    saveHistory([])
  }

  const handleToggleTopicState = (id, key) => {
    const cur = topicStates[id] ?? {}
    const next = { ...topicStates }
    if (cur[key]) {
      const rest = { ...cur }
      delete rest[key]
      if (Object.keys(rest).length) next[id] = rest
      else delete next[id]
    } else {
      next[id] = { ...cur, [key]: true }
    }
    setTopicStates(next)
    saveTopicStates(next)
  }

  const handleSetGoal = (min) => {
    setGoal(min)
    saveGoal(min)
  }

  const handleSearch = (q) => {
    setSearchQuery(q)
    setView('topics')
  }

  const activeCat = CATS.find((c) => c.id === topic.category)
  const activeLevel = LVLS.find((l) => l.id === levelOf(topic.category))

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img className="torii" src={import.meta.env.BASE_URL + 'torii.svg'} alt="" />
          <div>
            <h1 className="brand-title" key={`title-${lang}`}>
              {isEn ? (
                <>English <span>Speaking</span></>
              ) : (
                <>日本語<span>スピーキング</span></>
              )}
            </h1>
            <p className="brand-sub" key={`sub-${lang}`}>
              {isEn
                ? '每日英语口语 · 生活美語 Living English'
                : '连续日语口语练习 · 1日3分で口が動くようになる'}
            </p>
          </div>
        </div>
        <div className="header-right">
          <div className="lang-switch" role="tablist" aria-label="language">
            <button
              className={!isEn ? 'active' : ''}
              onClick={() => switchLang('ja')}
              role="tab"
              aria-selected={!isEn}
            >
              日本語
            </button>
            <button
              className={isEn ? 'active' : ''}
              onClick={() => switchLang('en')}
              role="tab"
              aria-selected={isEn}
            >
              English
            </button>
          </div>
          <input
            className="search global-search"
            placeholder={isEn ? '🔍 検索 话题 / 关键词…' : '🔍 検索 话题 / 关键词…'}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setView('topics')}
          />
          <button
            className="help-btn"
            onClick={() => setShowOnboard(true)}
            title="帮助 / 快捷键"
          >
            ?
          </button>
          <button
            className="theme-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? '深色模式' : '浅色模式'}
            aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          >
            {theme === 'light' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )}
          </button>
          <EdgeStatusBadge />
        </div>
      </header>

      <SegmentedTabs items={VIEWS} active={view} onChange={changeView} />

      <div className={`lang-stage ${switching ? 'lang-switching' : ''}`} key={lang}>
        {view === 'practice' && (
          <PracticeView
            topic={topic}
            categoryLabel={activeCat?.label ?? ''}
            levelLabel={activeLevel?.short ?? ''}
            profile={profile}
            overrides={overrides}
            topicStates={topicStates}
            onToggleTopicState={handleToggleTopicState}
            onAddRecord={addRecord}
            onNext={nextTopic}
            lang={lang}
          />
        )}

        {view === 'interview' && (
          <InterviewView
            profile={profile}
            overrides={overrides}
            onSaveProfile={handleSaveProfile}
            onSetOverride={handleSetOverride}
            onStart={startInterview}
          />
        )}

        {view === 'topics' && (
          <TopicBrowser
            allTopics={topicList}
            currentId={topic.id}
            states={topicStates}
            onToggleState={handleToggleTopicState}
            onPick={pickTopic}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            lang={lang}
          />
        )}

        {view === 'sentences' && <SentenceBank lang={lang} />}

        {view === 'history' && (
          <HistoryView
            records={history}
            topicsById={ALL_BY_ID}
            goal={goal}
            onSetGoal={handleSetGoal}
            allTopics={topicList}
            onClear={clearHistory}
            onReplay={pickTopic}
          />
        )}

      </div>

      {showOnboard && <Onboarding onClose={() => setShowOnboard(false)} />}
    </div>
  )
}
