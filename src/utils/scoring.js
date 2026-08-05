export const GRADES = [
  { g: 'S', min: 95, msg: '完璧です！プロ級の流暢さです！', emoji: '🏆' },
  { g: 'A', min: 85, msg: '素晴らしい！あと一歩でパーフェクト！', emoji: '🌟' },
  { g: 'B', min: 70, msg: 'よく頑張りました。続けましょう！', emoji: '👍' },
  { g: 'C', min: 50, msg: 'いい調子です。もう少し続けよう！', emoji: '💪' },
  { g: 'D', min: 0, msg: 'まずは1分間、止まらずに話してみよう！', emoji: '🌱' },
]

export function scoreSession({ sentences, duration, elapsed, finished }) {
  const target = Math.max(1, Math.round(duration / 12))
  const fill = Math.min(1, sentences / target)
  const comp = finished ? 1 : Math.min(1, elapsed / duration)
  const base = Math.round(60 * fill)
  const compPts = Math.round(25 * comp)
  const bonus = sentences >= target ? 15 : 0
  const effort = sentences > 0 ? 5 : 0
  const score = Math.min(100, base + compPts + bonus + effort)
  const grade = GRADES.find((g) => score >= g.min)?.g ?? 'D'
  return { target, score, grade }
}
