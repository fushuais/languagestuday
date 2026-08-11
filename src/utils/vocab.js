let sceneCache = null
let chapterCache = null
const levelCache = {}

function fetchJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`加载失败: ${url}`)
    return res.json()
  })
}

export function loadScenes() {
  if (sceneCache) return Promise.resolve(sceneCache)
  return fetchJson('./data/scenes.json').then((d) => {
    sceneCache = d
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

export function masteredAnywhere(learned, ja) {
  for (const k of Object.keys(learned)) {
    if (learned[k] && learned[k][ja]) return true
  }
  return false
}