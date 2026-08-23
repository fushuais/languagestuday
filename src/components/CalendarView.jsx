import { useMemo, useState } from 'react'
import { tap } from '../utils/haptics.js'

const CATEGORIES = [
  { id: 'exam', label: '受験', color: 'var(--accent)' },
  { id: 'study', label: '学習', color: 'var(--accent-blue)' },
  { id: 'important', label: '重要', color: 'var(--gold)' },
  { id: 'personal', label: '予定', color: 'var(--accent-cyan)' },
]

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(d) {
  return isSameDay(d, new Date())
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startDay = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid = []
  for (let i = 0; i < startDay; i++) {
    grid.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(new Date(year, month, d))
  }
  while (grid.length % 7 !== 0) {
    grid.push(null)
  }
  return grid
}

function formatDateFull(d) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`
}

export default function CalendarView({ events, onAdd, onUpdate, onDelete }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const grid = useMemo(() => getMonthGrid(year, month), [year, month])

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    })
    return map
  }, [events])

  const selectedEvents = useMemo(() => {
    if (!selected) return []
    const key = toISO(selected)
    return (eventsByDate[key] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }, [selected, eventsByDate])

  const prevMonth = () => {
    tap()
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const nextMonth = () => {
    tap()
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const goToday = () => {
    tap()
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelected(now)
  }

  const openAdd = () => {
    tap()
    setEditing(null)
    setShowModal(true)
  }

  const openEdit = (ev) => {
    tap()
    setEditing(ev)
    setShowModal(true)
  }

  const handleSave = (evData) => {
    tap()
    if (editing) {
      onUpdate({ ...editing, ...evData })
    } else {
      onAdd(evData)
    }
    setShowModal(false)
    setEditing(null)
  }

  const handleDelete = (ev) => {
    if (window.confirm(`「${ev.title}」を削除しますか？`)) {
      tap()
      onDelete(ev.id)
    }
  }

  const monthLabel = `${year}年${month + 1}月`

  return (
    <div className="calendar-view">
      <div className="cal-header">
        <div className="cal-header-top">
          <h2 className="cal-title">日程表</h2>
          <button className="cal-today-btn" onClick={goToday}>今日</button>
        </div>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth} aria-label="前月">‹</button>
          <span className="cal-month-label">{monthLabel}</span>
          <button className="cal-nav-btn" onClick={nextMonth} aria-label="翌月">›</button>
        </div>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`cal-weekday ${i >= 5 ? 'cal-weekend' : ''}`}>{w}</div>
        ))}
        {grid.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="cal-cell cal-cell-empty" />
          const key = toISO(d)
          const dayEvents = eventsByDate[key] || []
          const isSelected = selected && isSameDay(d, selected)
          const classes = [
            'cal-cell',
            isToday(d) ? 'cal-today' : '',
            isSelected ? 'cal-selected' : '',
            d.getDay() === 0 ? 'cal-sun' : d.getDay() === 6 ? 'cal-sat' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={key}
              className={classes}
              onClick={() => { tap(); setSelected(d) }}
            >
              <span className="cal-day-num">{d.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className="cal-dots">
                  {dayEvents.slice(0, 3).map((ev, j) => {
                    const cat = CATEGORIES.find((c) => c.id === ev.category)
                    return (
                      <span
                        key={j}
                        className="cal-dot"
                        style={{ background: cat?.color || 'var(--text-dim)' }}
                      />
                    )
                  })}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="cal-events">
        <div className="cal-events-header">
          <h3 className="cal-events-title">
            {selected ? formatDateFull(selected) : '日付を選択'}
          </h3>
        </div>
        {selected && selectedEvents.length === 0 && (
          <div className="cal-empty">予定なし</div>
        )}
        {selectedEvents.map((ev) => {
          const cat = CATEGORIES.find((c) => c.id === ev.category)
          return (
            <div key={ev.id} className="cal-event-card glass-card" onClick={() => openEdit(ev)}>
              <div className="cal-event-bar" style={{ background: cat?.color || 'var(--text-dim)' }} />
              <div className="cal-event-body">
                <div className="cal-event-top">
                  <span className="cal-event-cat" style={{ color: cat?.color }}>{cat?.label}</span>
                  {ev.time && <span className="cal-event-time">{ev.time}</span>}
                </div>
                <div className="cal-event-title">{ev.title}</div>
                {ev.note && <div className="cal-event-note">{ev.note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      <button className="cal-fab" onClick={openAdd} aria-label="予定を追加">
        <span className="cal-fab-icon">＋</span>
      </button>

      {showModal && (
        <EventModal
          event={editing}
          date={selected ? toISO(selected) : toISO(today)}
          onSave={handleSave}
          onDelete={editing ? () => handleDelete(editing) : null}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function EventModal({ event, date, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(event?.title || '')
  const [evDate, setEvDate] = useState(event?.date || date)
  const [time, setTime] = useState(event?.time || '')
  const [category, setCategory] = useState(event?.category || 'exam')
  const [note, setNote] = useState(event?.note || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !evDate) return
    onSave({
      id: event?.id || crypto.randomUUID(),
      title: title.trim(),
      date: evDate,
      time: time || null,
      category,
      note: note.trim() || null,
    })
  }

  return (
    <div className="cal-modal-overlay" onClick={onClose}>
      <div className="cal-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="cal-modal-head">
          <h3>{event ? '予定を編集' : '予定を追加'}</h3>
          <button className="settings-close" onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <form className="cal-modal-form" onSubmit={handleSubmit}>
          <input
            className="cal-input"
            placeholder="タイトル（例：専門学校説明会）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <div className="cal-row2">
            <div className="cal-field">
              <label className="cal-label">日付</label>
              <input
                className="cal-input"
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
              />
            </div>
            <div className="cal-field">
              <label className="cal-label">時間（任意）</label>
              <input
                className="cal-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="cal-categories">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cal-cat-btn ${category === c.id ? 'cal-cat-active' : ''}`}
                style={{ '--cat-color': c.color }}
                onClick={() => { tap(); setCategory(c.id) }}
              >
                <span className="cal-cat-dot" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
          <textarea
            className="cal-input cal-textarea"
            placeholder="メモ（任意）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <div className="cal-modal-actions">
            {onDelete && (
              <button type="button" className="cal-btn-del" onClick={onDelete}>削除</button>
            )}
            <button type="submit" className="cal-btn-save" disabled={!title.trim() || !evDate}>
              {event ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
