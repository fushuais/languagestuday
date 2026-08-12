import { CATEGORIES, TOPICS, LEVELS, topicLevel } from './data/topics.js'
import { EN_CATEGORIES, EN_TOPICS, EN_LEVELS, enTopicLevel } from './data/english.js'
import { INTERVIEW, interviewToTopic } from './data/interview.js'
import PracticeView from './components/PracticeView.jsx'
import TopicBrowser from './components/TopicBrowser.jsx'
import SegmentedTabs from './components/SegmentedTabs.jsx'
import InterviewView from './components/InterviewView.jsx'
import Onboarding, { shouldOnboard } from './components/Onboarding.jsx'
import EdgeStatusBadge from './components/EdgeStatusBadge.jsx'
import { lazy, Suspense, startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { mergeCloudState, useAuth } from './context/auth.jsx'
import { loadSpeechPrefs, saveSpeechPrefs } from './utils/storage.js'
import { setSoundEnabled, soundEnabledValue } from './utils/sound.js'
import { setHapticsEnabled, hapticsEnabled } from './utils/haptics.js'
import { debounce } from './utils/rateLimit.js'
import LoginView from './components/LoginView.jsx'
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
import { tap } from './utils/haptics.js'
import { normLevel } from './utils/vocab.js'

const SentenceBank = lazy(() => import('./components/SentenceBank.jsx'))
const HistoryView = lazy(() => import('./components/HistoryView.jsx'))
const Settings = lazy(() => import('./components/Settings.jsx'))
const About = lazy(() => import('./components/About.jsx'))
const WordsView = lazy(() => import('./components/WordsView.jsx'))

const JA_TOPICS = [...TOPICS, ...INTERVIEW.map(interviewToTopic)]
const ALL_BY_ID = Object.fromEntries([...JA_TOPICS, ...EN_TOPICS].map((t) => [t.id, t]))

const VIEWS_JA = [
  { id: 'practice', label: '連続練習' },
  { id: 'interview', label: '面接対策' },
  { id: 'words', label: '単語帳' },
  { id: 'topics', label: '話題カード' },
  { id: 'history', label: '練習記録' },
]

const VIEWS_EN = [
  { id: 'practice', label: 'Practice' },
  { id: 'topics', label: 'Topics' },
  { id: 'sentences', label: '生活美語' },
  { id: 'history', label: 'History' },
]

const WORDS_KEY = 'nihongo-words-v1'

function loadWordsProgress() {
  try {
    return JSON.parse(localStorage.getItem(WORDS_KEY)) || {}
  } catch {
    return {}
  }
}

function saveWordsProgress(p) {
  try {
    localStorage.setItem(WORDS_KEY, JSON.stringify(p))
  } catch {
    // ignore
  }
}

export default function App() {
  const { user, syncStatus, logout, applyRemote, pushLocal } = useAuth()
  const [lang, setLang] = useState(loadLang)
  const [theme, setTheme] = useState(loadTheme)
  const [switching, setSwitching] = useState(false)
  const [view, setView] = useState(() => (loadLang() === 'en' ? 'practice' : 'interview'))
  const [topic, setTopic] = useState(() => (loadLang() === 'en' ? EN_TOPICS[0] : JA_TOPICS[0]))
  const [history, setHistory] = useState(loadHistory)
  const [profile, setProfile] = useState(loadProfile)
  const [overrides, setOverrides] = useState(loadOverrides)
  const [topicStates, setTopicStates] = useState(loadTopicStates)
  const [goal, setGoal] = useState(loadGoal)
  const [learnedWords, setLearnedWords] = useState(() => loadWordsProgress())
  const [speechPrefs, setSpeechPrefs] = useState(() => loadSpeechPrefs())
  const [soundOn, setSoundOn] = useState(() => soundEnabledValue())
  const [hapticsOn, setHapticsOn] = useState(() => hapticsEnabled())
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnboard, setShowOnboard] = useState(() => shouldOnboard())
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [practiceActive, setPracticeActive] = useState(false)

  const debouncedSave = useRef({
    history: debounce((v) => saveHistory(v), 600),
    profile: debounce((v) => saveProfile(v), 600),
    overrides: debounce((v) => saveOverrides(v), 400),
    topicStates: debounce((v) => saveTopicStates(v), 400),
    goal: debounce((v) => saveGoal(v), 400),
    learnedWords: debounce((v) => saveWordsProgress(v), 400),
  }).current

  // history 最新值引用：addRecord/clearHistory 需在 setState 后立即拿到最终列表用于保存
  const historyRef = useRef(history)
  historyRef.current = history

  // learnedWords 最新值引用：bumpWord 在 updater 外计算新值用于保存
  const learnedRef = useRef(learnedWords)
  learnedRef.current = learnedWords

  // 最新本地状态快照：供登录后与云端 merge（登录拉取是异步的，
  // 期间可能有本地新记录产生，用 ref 保证使用最新的本地基线）
  const localStateRef = useRef()
  localStateRef.current = {
    history,
    profile,
    overrides,
    topicStates,
    goal,
    learnedWords,
    theme,
    lang,
    speechPrefs,
    sound: soundOn,
    haptics: hapticsOn,
  }

  const closeMenu = useCallback(() => {
    if (menuClosing) return
    setMenuClosing(true)
    setConfirmLogout(false)
    window.setTimeout(() => {
      setShowMenu(false)
      setMenuClosing(false)
    }, 260)
  }, [menuClosing])

  useEffect(() => {
    const flush = () => {
      for (const k of Object.keys(debouncedSave)) debouncedSave[k].flush()
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!showMenu) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [showMenu, closeMenu])

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

  useEffect(() => {
    const onSpeechPrefs = (e) => setSpeechPrefs(e.detail || loadSpeechPrefs())
    const onSound = (e) => setSoundOn(e.detail.enabled)
    const onHaptics = (e) => setHapticsOn(e.detail.enabled)
    window.addEventListener('speech-prefs-changed', onSpeechPrefs)
    window.addEventListener('sound-changed', onSound)
    window.addEventListener('haptics-changed', onHaptics)
    return () => {
      window.removeEventListener('speech-prefs-changed', onSpeechPrefs)
      window.removeEventListener('sound-changed', onSound)
      window.removeEventListener('haptics-changed', onHaptics)
    }
  }, [])

  const syncIn = useRef(false)

  useEffect(() => {
    if (!user || syncIn.current) return
    syncIn.current = true
    applyRemote()
      .then((cloud) => {
        if (!cloud) return
        const merged = mergeCloudState(localStateRef.current, cloud)
        setHistory(merged.history)
        setProfile(merged.profile)
        setOverrides(merged.overrides)
        setTopicStates(merged.topicStates)
        setGoal(merged.goal)
        setLearnedWords(merged.learnedWords)
        if (merged.theme !== theme) {
          setTheme(merged.theme)
          saveTheme(merged.theme)
        }
        if (merged.lang !== lang) {
          setLang(merged.lang)
          saveLang(merged.lang)
          setTopic(merged.lang === 'en' ? EN_TOPICS[0] : JA_TOPICS[0])
        }
        if (merged.speechPrefs) {
          setSpeechPrefs(merged.speechPrefs)
          saveSpeechPrefs(merged.speechPrefs)
        }
        if (typeof merged.sound === 'boolean' && merged.sound !== soundOn) {
          setSoundOn(merged.sound)
          setSoundEnabled(merged.sound)
        }
        if (typeof merged.haptics === 'boolean' && merged.haptics !== hapticsOn) {
          setHapticsOn(merged.haptics)
          setHapticsEnabled(merged.haptics)
        }
      })
      .catch(() => {
        // applyRemote 内部已把 syncStatus 置为 error
      })
      .finally(() => {
        syncIn.current = false
      })
    // 拉取只在登录态变化时执行一次，state 依赖用 ref 快照传递即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const lastPushRef = useRef('')

  useEffect(() => {
    if (!user) return
    const snapshot = JSON.stringify({
      history,
      profile,
      overrides,
      topicStates,
      goal,
      learnedWords,
      theme,
      lang,
      speechPrefs,
      sound: soundOn,
      haptics: hapticsOn,
    })
    if (snapshot === lastPushRef.current) return
    lastPushRef.current = snapshot
    const timer = setTimeout(() => {
      pushLocal({
        history,
        profile,
        overrides,
        topicStates,
        goal,
        learnedWords,
        theme,
        lang,
        speechPrefs,
        sound: soundOn,
        haptics: hapticsOn,
      })
    }, 1200)
    return () => clearTimeout(timer)
  }, [
    user,
    history,
    profile,
    overrides,
    topicStates,
    goal,
    learnedWords,
    theme,
    lang,
    speechPrefs,
    soundOn,
    hapticsOn,
    pushLocal,
  ])

  const toggleTheme = () => {
    tap()
    const root = document.documentElement
    root.classList.add('theme-anim')
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    saveTheme(next)
    window.setTimeout(() => root.classList.remove('theme-anim'), 450)
  }

  const bumpWord = useCallback((sceneId, ja, delta) => {
    setLearnedWords((prev) => {
      const cur = prev[sceneId] || {}
      const nextLevel = Math.min(3, Math.max(0, normLevel(cur[ja]) + delta))
      return { ...prev, [sceneId]: { ...cur, [ja]: nextLevel } }
    })
    learnedRef.current = { ...learnedRef.current, [sceneId]: { ...(learnedRef.current[sceneId] || {}), [ja]: Math.min(3, Math.max(0, normLevel((learnedRef.current[sceneId] || {})[ja]) + delta)) } }
    debouncedSave.learnedWords(learnedRef.current)
  }, [debouncedSave])

  const changeView = (next) => {
    if (next !== view && practiceActive) {
      const ok = window.confirm('練習中です。途中でやめて移動しますか？未記録の練習は失われます。')
      if (!ok) return
      setPracticeActive(false)
    }
    tap()
    startTransition(() => setView(next))
    window.scrollTo(0, 0)
    window.dispatchEvent(new Event('viewchange'))
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
        if (next === 'en' && view === 'words') setView('practice')
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
    debouncedSave.profile(p)
  }

  const handleSetOverride = (id, text) => {
    const next = { ...overrides }
    if (text === null || text.trim() === '') delete next[id]
    else next[id] = text.trim()
    setOverrides(next)
    debouncedSave.overrides(next)
  }

  const addRecord = (record) => {
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 500)
      historyRef.current = next
      return next
    })
    queueMicrotask(() => debouncedSave.history(historyRef.current))
  }

  const clearHistory = () => {
    setHistory([])
    debouncedSave.history([])
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
    debouncedSave.topicStates(next)
  }

  const handleSetGoal = (min) => {
    setGoal(min)
    debouncedSave.goal(min)
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
          <div className="search-wrap global-search-wrap">
            <input
              className="search global-search"
              placeholder="🔍 検索 话题 / 关键词 / 句子…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setView('topics')}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="清除搜索"
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="menu-btn"
            onClick={() => setShowMenu((v) => !v)}
            title="菜单"
            aria-label="菜单"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="header-inline-actions">
          <button
            className="help-btn"
            onClick={() => setShowAbout(true)}
            title="关于 / 项目介绍"
          >
            ?
          </button>
          {user ? (
            <>
              <button
                className="account-btn"
                onClick={() => { if (window.confirm(`退出登录 ${user.username} 吗？退出后数据将留在云端。`)) { logout(); } }}
                title={`已登录 ${user.username}，点击退出`}
                aria-label="退出登录"
              >
                {user.username}
              </button>
              <span
                className={`sync-dot sync-${syncStatus}`}
                title={
                  syncStatus === 'syncing'
                    ? '正在同步…'
                    : syncStatus === 'error'
                      ? '同步失败，检查网络后重试'
                      : `已登录 ${user.username} · 数据云同步`
                }
                aria-hidden="true"
              />
            </>
          ) : (
            <button
              className="account-btn"
              onClick={() => setShowLogin(true)}
              title="登录 / 注册（游客可跳过）"
              aria-label="登录注册"
            >
              登录
            </button>
          )}
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
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            title="设置 / 設定"
            aria-label="设置"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <EdgeStatusBadge />
          </div>
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

        {view === 'words' && (
          <Suspense fallback={<div className="view-fallback" />}>
            <WordsView learned={learnedWords} onBumpWord={bumpWord} />
          </Suspense>
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

        {view === 'sentences' && (
          <Suspense fallback={<div className="view-fallback" />}>
            <SentenceBank lang={lang} />
          </Suspense>
        )}

        {view === 'history' && (
          <Suspense fallback={<div className="view-fallback" />}>
            <HistoryView
              records={history}
              topicsById={ALL_BY_ID}
              goal={goal}
              onSetGoal={handleSetGoal}
              allTopics={topicList}
              onClear={clearHistory}
              onReplay={pickTopic}
            />
          </Suspense>
        )}

      </div>

      {showOnboard && <Onboarding onClose={() => setShowOnboard(false)} />}
      <Suspense fallback={null}>
        {showAbout && <About onClose={() => setShowAbout(false)} />}
        {showSettings && <Settings lang={lang} onClose={() => setShowSettings(false)} />}
      </Suspense>
      {showLogin && <LoginView onClose={() => setShowLogin(false)} />}

      {showMenu && (
        <div
          className={`menu-overlay ${menuClosing ? 'menu-closing' : ''}`}
          onClick={closeMenu}
        >
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <div className="menu-head">
              <div className="settings-title">菜单</div>
              <button className="settings-close" onClick={closeMenu} aria-label="关闭菜单">
                ✕
              </button>
            </div>

            <button
              className="menu-item"
              onClick={() => {
                tap()
                toggleTheme()
              }}
              aria-live="polite"
            >
              <span>主题</span>
              <span className="menu-item-value">{theme === 'light' ? '浅色' : '深色'}</span>
            </button>

            {user ? (
              confirmLogout ? (
                <button
                  className="menu-item menu-item-danger"
                  onClick={() => {
                    tap()
                    logout()
                    setShowMenu(false)
                    setConfirmLogout(false)
                    setMenuClosing(false)
                  }}
                >
                  <span>确认退出？</span>
                  <span className="menu-item-value">退出后数据将留在云端</span>
                </button>
              ) : (
                <>
                  <button
                    className="menu-item"
                    onClick={() => {
                      tap()
                      setConfirmLogout(true)
                    }}
                  >
                    <span>账号：{user.username}</span>
                    <span className="menu-item-value">退出登录</span>
                  </button>
                  <button
                    className="menu-item item-sep"
                    onClick={() => {
                      tap()
                      closeMenu()
                    }}
                  >
                    <span>取消</span>
                    <span className="menu-item-value">继续使用</span>
                  </button>
                </>
              )
            ) : (
              <button
                className="menu-item"
                onClick={() => {
                  tap()
                  closeMenu()
                  window.setTimeout(() => setShowLogin(true), 280)
                }}
              >
                <span>账号</span>
                <span className="menu-item-value">登录 / 注册</span>
              </button>
            )}

            <button
              className="menu-item"
              onClick={() => {
                tap()
                closeMenu()
                window.setTimeout(() => setShowSettings(true), 280)
              }}
            >
              <span>设置</span>
              <span className="menu-item-value">语音 / 反馈</span>
            </button>

            <button
              className="menu-item"
              onClick={() => {
                tap()
                closeMenu()
                window.setTimeout(() => setShowAbout(true), 280)
              }}
            >
              <span>关于</span>
              <span className="menu-item-value">项目介绍</span>
            </button>

            <div className="menu-item menu-item-static">
              <span>朗读引擎</span>
              <span className="menu-item-value"><EdgeStatusBadge /></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
