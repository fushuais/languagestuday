const DAY = 86400000

function dayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function computeDailyStats(records) {
  const today = startOfDay(Date.now())
  const byDay = new Map()
  records.forEach((r) => {
    const t = new Date(r.date).getTime()
    const key = dayKey(t)
    const prev = byDay.get(key) ?? { minutes: 0, sessions: 0, sentences: 0 }
    byDay.set(key, {
      minutes: prev.minutes + Math.round(r.duration / 60),
      sessions: prev.sessions + 1,
      sentences: prev.sentences + r.sentences,
    })
  })

  const todayMinutes = byDay.get(dayKey(Date.now()))?.minutes ?? 0
  const todaySessions = byDay.get(dayKey(Date.now()))?.sessions ?? 0

  let streak = 0
  let cursor = today
  if ((byDay.get(dayKey(today))?.sessions ?? 0) === 0) cursor -= DAY
  while (byDay.get(dayKey(cursor))?.sessions) {
    streak += 1
    cursor -= DAY
  }

  let best = 0
  let run = 0
  let prevKey = null
  const keys = [...byDay.keys()].sort()
  keys.forEach((k) => {
    if (prevKey) {
      const gap = (new Date(k).getTime() - new Date(prevKey).getTime()) / DAY
      run = gap === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    if (run > best) best = run
    prevKey = k
  })

  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const t = today - i * DAY
    const d = byDay.get(dayKey(t))
    last7.push({
      key: dayKey(t),
      label: `${new Date(t).getMonth() + 1}/${new Date(t).getDate()}`,
      minutes: d?.minutes ?? 0,
      sessions: d?.sessions ?? 0,
    })
  }

  return { todayMinutes, todaySessions, streak, best, last7 }
}

export function recommendTopic(records, allTopics) {
  const lastByTopic = new Map()
  records.forEach((r) => {
    const prev = lastByTopic.get(r.topicId)
    if (!prev || r.date > prev) lastByTopic.set(r.topicId, r.date)
  })
  const never = allTopics.filter((t) => !lastByTopic.has(t.id))
  if (never.length) return never[0]
  let oldest = allTopics[0]
  let oldestDate = Infinity
  allTopics.forEach((t) => {
    const d = new Date(lastByTopic.get(t.id)).getTime()
    if (d < oldestDate) {
      oldestDate = d
      oldest = t
    }
  })
  return oldest
}
