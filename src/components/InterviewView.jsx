import { useState } from 'react'
import { INTERVIEW, renderAnswer } from '../data/interview.js'
import { DEFAULT_PROFILE, PROFILE_FIELDS } from '../utils/profile.js'
import SpeechPlayer from './SpeechPlayer.jsx'
import { plainText } from '../utils/speech.js'

const SECTIONS = [
  { id: 'intro', title: '自己紹介・学習・学校志望', zh: '自我介绍 · 学习经历 · 入学志愿', from: 1, to: 16 },
  { id: 'work', title: 'アルバイト・経済・家庭', zh: '打工 · 经济状况 · 家庭情况', from: 17, to: 27 },
  { id: 'life', title: '性格・日本での生活', zh: '性格特点 · 在日生活 · 其他', from: 28, to: 37 },
]

export default function InterviewView({
  profile,
  overrides,
  onSaveProfile,
  onSetOverride,
  onStart,
}) {
  const [mode, setMode] = useState('list')
  const [openId, setOpenId] = useState(null)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [openSections, setOpenSections] = useState(() => new Set())
  const [answerMode, setAnswerMode] = useState('simple')

  const finalAnswer = (item) => overrides[item.id] ?? renderAnswer(item.a, profile)
  const simpleAnswer = (item) => renderAnswer(item.simple, profile)

  const toggleSection = (id) =>
    setOpenSections((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const go = (delta) => {
    setRevealed(false)
    setIdx((i) => (i + delta + INTERVIEW.length) % INTERVIEW.length)
  }

  const jump = (i) => {
    setRevealed(false)
    setIdx(i)
  }

  const item = INTERVIEW[idx]

  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="section-title">面接対策 · 专门学校入学面试</h2>
          <p className="section-sub">
            共 {INTERVIEW.length} 问高频问题。简洁版方便记忆，详细版用于深入练习。
          </p>
        </div>
        <div className="iv-toggle">
          <button className={`iv-mode-btn ${mode === 'list' ? 'active' : ''}`} onClick={() => setMode('list')}>
            📋 リスト学習
          </button>
          <button className={`iv-mode-btn ${mode === 'flash' ? 'active' : ''}`} onClick={() => setMode('flash')}>
            🎤 口頭練習
          </button>
        </div>
      </div>

      {mode === 'list' && (
        <div className="iv-answer-toggle">
          <button className={`iv-at-btn ${answerMode === 'simple' ? 'active' : ''}`} onClick={() => setAnswerMode('simple')}>
            📝 簡潔版
          </button>
          <button className={`iv-at-btn ${answerMode === 'detailed' ? 'active' : ''}`} onClick={() => setAnswerMode('detailed')}>
            📖 詳細版
          </button>
        </div>
      )}

      <div className="profile-panel">
        <button className="profile-head" onClick={() => setShowProfile((s) => !s)}>
          <span>👤 个人资料 · 自动填入答案（姓名/年龄/出身/收入等）</span>
          <span className="iv-chev">{showProfile ? '−' : '＋'}</span>
        </button>
        {showProfile && (
          <div className="profile-body">
            <div className="profile-grid">
              {PROFILE_FIELDS.map((f) => (
                <label key={f.key} className="profile-field">
                  <span>{f.label}</span>
                  <input
                    type="text"
                    value={draft[f.key] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="iv-actions" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setDraft(DEFAULT_PROFILE)
                }}
              >
                重置为默认
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onSaveProfile(draft)
                  setShowProfile(false)
                }}
              >
                保存并应用到全部答案 ✓
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === 'list' ? (
        <div className="iv-list">
          {SECTIONS.map((sec) => {
            const secItems = INTERVIEW.filter((it) => it.id >= sec.from && it.id <= sec.to)
            const open = openSections.has(sec.id)
            return (
              <div key={sec.id} className={`iv-section ${open ? 'open' : ''}`}>
                <button className="iv-section-head" onClick={() => toggleSection(sec.id)}>
                  <span className="iv-section-title">
                    {sec.title}
                    <small>{sec.zh}</small>
                  </span>
                  <span className="iv-section-count">{secItems.length} 問</span>
                  <span className="iv-chev">{open ? '−' : '＋'}</span>
                </button>
                {open && (
                  <div className="iv-section-body">
                    {secItems.map((it) => {
                      const openItem = openId === it.id
                      const isEditing = editingId === it.id
                      return (
                        <div key={it.id} className={`iv-item ${openItem ? 'open' : ''}`}>
                          <button
                            className="iv-head"
                            onClick={() => setOpenId(openItem ? null : it.id)}
                          >
                            <span className="iv-num">{String(it.id).padStart(2, '0')}</span>
                            <span className="iv-q">
                              {it.q}
                              <small>{it.qReading}</small>
                              <em>{it.zh}</em>
                            </span>
                            <span className="iv-chev">{openItem ? '−' : '＋'}</span>
                          </button>
                          {openItem && (
                            <div className="iv-body">
                              {isEditing ? (
                                <>
                                  <textarea
                                    className="iv-editor"
                                    rows={5}
                                    value={editDraft}
                                    onChange={(e) => setEditDraft(e.target.value)}
                                  />
                                  <div className="iv-actions">
                                    <button
                                      className="btn btn-primary"
                                      onClick={() => {
                                        onSetOverride(it.id, editDraft)
                                        setEditingId(null)
                                      }}
                                    >
                                      保存答案
                                    </button>
                                    <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                                      取消
                                    </button>
                                    {overrides[it.id] && (
                                      <button
                                        className="btn btn-ghost"
                                        onClick={() => {
                                          onSetOverride(it.id, null)
                                          setEditingId(null)
                                        }}
                                      >
                                        ↺ 恢复默认
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {answerMode === 'simple' ? (
                                    <div className="iv-answer iv-simple">{simpleAnswer(it)}</div>
                                  ) : (
                                    <div className="iv-answer">{finalAnswer(it)}</div>
                                  )}
                                  {overrides[it.id] && (
                                    <div className="override-note">✏️ 已使用你自定义的答案</div>
                                  )}
                                  <div className="iv-actions">
                                    <SpeechPlayer text={plainText(it.q)} compact />
                                    <SpeechPlayer text={plainText(answerMode === 'simple' ? simpleAnswer(it) : finalAnswer(it))} compact />
                                    <button
                                      className="btn btn-ghost"
                                      onClick={() => {
                                        setEditingId(it.id)
                                        setEditDraft(finalAnswer(it))
                                      }}
                                    >
                                      ✏️ 编辑答案
                                    </button>
                                    <button className="btn btn-primary" onClick={() => onStart(it)}>
                                      ▶ 練習で話す
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flash-wrap">
          <div className="flash-progress">
            {INTERVIEW.map((it, i) => (
              <button
                key={it.id}
                className={`dot ${i === idx ? 'active' : ''} ${i < idx ? 'done' : ''}`}
                onClick={() => jump(i)}
                title={`Q${it.id}`}
              />
            ))}
          </div>

          <div className="flash-card">
            <div className="flash-count">
              {String(idx + 1).padStart(2, '0')} / {INTERVIEW.length}
            </div>
            <div className="flash-q">{item.q}</div>
            <div className="flash-sub">
              {item.qReading} · {item.zh}
            </div>

            {revealed ? (
              <div className="flash-answer">
                <div className="iv-answer">{finalAnswer(item)}</div>
                {overrides[item.id] && (
                  <div className="override-note" style={{ marginTop: 8 }}>
                    ✏️ 已使用你自定义的答案
                  </div>
                )}
                <div className="iv-actions">
                  <SpeechPlayer text={plainText(finalAnswer(item))} compact />
                  <button className="btn btn-primary" onClick={() => onStart(item)}>
                    ▶ 練習で話す
                  </button>
                </div>
              </div>
            ) : (
              <div className="flash-hidden">
                <div className="flash-hidden-icon">🤫</div>
                答えは隠しています。まず自分の言葉で答えを言ってみましょう。
              </div>
            )}

            <div className="flash-controls">
              <button className="btn btn-ghost" onClick={() => go(-1)}>
                ← 前へ
              </button>
              <button
                className={`btn ${revealed ? 'btn-ghost' : 'btn-primary'}`}
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? '🙈 答えを隠す' : '👀 答えを見る'}
              </button>
              <button className="btn btn-ghost" onClick={() => go(1)}>
                次へ →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
