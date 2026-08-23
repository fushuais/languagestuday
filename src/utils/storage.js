const STORAGE_KEY = 'nihongo-history-v1'
const OVERRIDE_KEY = 'nihongo-interview-overrides-v1'
const STATE_KEY = 'nihongo-topic-states-v1'
const GOAL_KEY = 'nihongo-goal-v1'
const SPEECH_KEY = 'nihongo-speech-prefs-v1'
const LANG_KEY = 'nihongo-lang-v1'
const THEME_KEY = 'nihongo-theme-v1'
const SCHEDULE_KEY = 'nihongo-schedule-v1'

export const DEFAULT_GOAL_MIN = 5
export const DEFAULT_SPEECH = { voice: 'ja-JP-NanamiNeural', rate: 1, enabled: true, engine: 'auto' }

export function loadLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ja'
  } catch {
    return 'ja'
  }
}

export function saveLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // ignore
  }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveHistory(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // ignore
  }
}

export function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveOverrides(overrides) {
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides))
  } catch {
    // ignore
  }
}

export function loadTopicStates() {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveTopicStates(states) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(states))
  } catch {
    // ignore
  }
}

export function loadGoal() {
  try {
    const n = Number(localStorage.getItem(GOAL_KEY))
    return n > 0 ? n : DEFAULT_GOAL_MIN
  } catch {
    return DEFAULT_GOAL_MIN
  }
}

export function saveGoal(min) {
  try {
    localStorage.setItem(GOAL_KEY, String(min))
  } catch {
    // ignore
  }
}

export function loadSpeechPrefs() {
  try {
    const raw = localStorage.getItem(SPEECH_KEY)
    return raw ? { ...DEFAULT_SPEECH, ...JSON.parse(raw) } : { ...DEFAULT_SPEECH }
  } catch {
    return { ...DEFAULT_SPEECH }
  }
}

export function saveSpeechPrefs(prefs) {
  try {
    localStorage.setItem(SPEECH_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
}

export function loadSchedule() {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSchedule(events) {
  try {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(events))
  } catch {
    // ignore
  }
}
