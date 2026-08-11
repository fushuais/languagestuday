import { useState } from 'react'
import { computeDailyStats, recommendTopic } from '../utils/progress.js'

const fmtDate = (iso) => {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const GOAL_OPTIONS = [3, 5, 10, 15]

export default function HistoryView({
  records,
  topicsById,
  goal,
  onSetGoal,
  allTopics,
  onClear,
  onReplay,
}) {
  const [showGoal, setShowGoal] = useState(false)
  const stats = computeDailyStats(records)
  const totalSessions = records.length
  const totalMinutes = Math.round(
    records.reduce((sum, r) => sum + r.duration, 0) / 60,
  )
  const totalSentences = records.reduce((sum, r) => sum + r.sentences, 0)

  const rec = recommendTopic(records, allTopics)
  const safeGoal = goal > 0 ? goal : 15
  const goalPct = Math.min(100, Math.round((stats.todayMinutes / safeGoal) * 100))
  const maxDay = Math.max(...stats.last7.map((d) => d.minutes), 1)

  return (
    <section>
      <div className="streak-bar">
        <div className="streak-flame">🔥</div>
        <div className="streak-nums">
          <span className="streak-big">{stats.streak}</span>
          <span className="streak-label">日連続</span>
        </div>
        <div className="streak-goal">
          <div className="goal-row">
            <span className="goal-title">
              今日の目標 · {stats.todayMinutes}/{safeGoal}分
            </span>
            <button className="goal-edit" onClick={() => setShowGoal((s) => !s)}>
              {showGoal ? '閉じる' : '設定'}
            </button>
          </div>
          <div className="goal-track">
            <div className={`goal-fill ${goalPct >= 100 ? 'done' : ''}`} style={{ width: `${goalPct}%` }} />
          </div>
          {goalPct >= 100 && <div className="goal-done">🎉 今日の目標達成！素晴らしい！</div>}
        </div>
        {showGoal && (
          <div className="goal-options">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                className={`chip ${goal === g ? 'active' : ''}`}
                onClick={() => onSetGoal(g)}
              >
                {g}分
              </button>
            ))}
          </div>
        )}
      </div>

      {rec && (
        <div className="rec-card">
          <span className="rec-icon">✨</span>
          <div className="rec-body">
            <div className="rec-title">今日のおすすめ話題</div>
            <div className="rec-name">
              {rec.emoji} {rec.title} <small>{rec.titleZh}</small>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onReplay(rec)}>
            ▶ 練習する
          </button>
        </div>
      )}

      <h2 className="section-title">練習記録</h2>
      <p className="section-sub">坚持练习，嘴巴会越来越顺。记录保存在本机浏览器中。</p>

      <div className="history-summary">
        <div className="stat">
          <div className="num">{totalSessions}</div>
          <div className="label">練習回数</div>
        </div>
        <div className="stat">
          <div className="num">{totalMinutes}</div>
          <div className="label">合計分</div>
        </div>
        <div className="stat">
          <div className="num">{totalSentences}</div>
          <div className="label">話した文数</div>
        </div>
      </div>

      {stats.last7.some((d) => d.sessions > 0) && (
        <div className="trend-card">
          <div className="trend-title">近 7 日練習時間（分）</div>
          <div className="trend-bars">
            {stats.last7.map((d) => (
              <div key={d.key} className="trend-col" title={`${d.label} · ${d.minutes}分 · ${d.sessions}回`}>
                <div className="trend-val">
                  {d.minutes > 0 ? d.minutes : ''}
                </div>
                <div
                  className={`trend-bar ${d.sessions > 0 ? 'on' : ''}`}
                  style={{ height: `${Math.max(4, (d.minutes / maxDay) * 100)}%` }}
                />
                <div className="trend-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty">
          <div className="icon">📝</div>
          <p>
            还没有练习记录。
            <br />
            去「連続練習」选一个话题，说满 1 分钟试试吧！
          </p>
        </div>
      ) : (
        <>
          <div className="history-list">
            {records.map((r) => (
              <div key={r.id} className="history-item">
                <div className="h-left">
                  <h3>
                    {r.topicTitle} <span style={{ color: 'var(--text-faint)', fontWeight: 400, fontSize: 13 }}>{r.topicZh}</span>
                  </h3>
                  <div className="h-meta">
                    {fmtDate(r.date)} · {Math.round(r.duration / 60)}分 · {r.sentences}句
                  </div>
                </div>
                <div className="h-right">
                  <div className="h-score">
                    {r.grade && <span className={`h-grade grade-${r.grade}`}>{r.grade}</span>}
                    {r.score}
                    <span> /100</span>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '5px 12px', fontSize: '12px', marginTop: 6 }}
                    onClick={() => onReplay(topicsById[r.topicId])}
                  >
                    再练一次
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="next-row" style={{ marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={onClear}>
              すべて削除（清空记录）
            </button>
          </div>
        </>
      )}
    </section>
  )
}
