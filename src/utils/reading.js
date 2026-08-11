let readingCache = null
let essayCache = null

function fetchJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`加载失败: ${url}`)
    return res.json()
  })
}

export function loadReading() {
  if (readingCache) return Promise.resolve(readingCache)
  return fetchJson('./data/reading.json').then((d) => {
    readingCache = d
    return d
  })
}

export function loadEssayTemplates() {
  if (essayCache) return Promise.resolve(essayCache)
  return fetchJson('./data/essay-templates.json').then((d) => {
    essayCache = d
    return d
  })
}
