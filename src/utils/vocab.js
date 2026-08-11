let chapterCache = null
let grammarCache = null
const levelCache = {}

function fetchJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`加载失败: ${url}`)
    return res.json()
  })
}

export function loadGrammar() {
  if (grammarCache) return Promise.resolve(grammarCache)
  return fetchJson('./data/grammar.json').then((d) => {
    grammarCache = d
    return d
  })
}

export function loadLevel(level) {
  const key = level.toLowerCase()
  if (levelCache[key]) return Promise.resolve(levelCache[key])
  return fetchJson(`./data/vocab-${key}.json`).then((d) => {
    levelCache[key] = d
    return d
  })
}

export function loadChapters() {
  if (chapterCache) return Promise.resolve(chapterCache)
  return fetchJson('./data/chapters.json').then((d) => {
    chapterCache = d
    return d
  })
}

export const MASTERY_LEVEL = 3

export function normLevel(v) {
  if (typeof v === 'number') return Math.min(MASTERY_LEVEL, Math.max(0, v))
  return v ? MASTERY_LEVEL : 0
}

export function maxLevelAnywhere(learned, ja) {
  if (!learned) return 0
  let max = 0
  for (const k of Object.keys(learned)) {
    if (!learned[k]) continue
    const lv = normLevel(learned[k][ja])
    if (lv > max) max = lv
  }
  return max
}

export function masteredAnywhere(learned, ja) {
  return maxLevelAnywhere(learned, ja) >= MASTERY_LEVEL
}