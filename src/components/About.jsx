import { useState } from 'react'

const PROJECT_URL = 'https://github.com/fushuais'
const FEEDBACK_EMAIL = 'fushuai137829@gmail.com'

export default function About({ onClose }) {
  const [feedback, setFeedback] = useState('')

  const sendFeedback = (e) => {
    e.preventDefault()
    const text = feedback.trim()
    if (!text) return
    const subject = encodeURIComponent('意見フィードバック / 意见反馈 - 日本語スピーキング')
    const body = encodeURIComponent(
      `${text}\n\n——\n装置: ${navigator.userAgent}\n画面: ${window.screen.width}×${window.screen.height}\n`,
    )
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-card" onClick={(e) => e.stopPropagation()}>
        <div className="about-icon">
          <img className="torii" src={import.meta.env.BASE_URL + 'torii.svg'} alt="" />
        </div>
        <h2 className="about-title">日本語スピーキング</h2>
        <p className="about-sub">日语口语练习 · Daily Japanese Speaking</p>

        <div className="about-intro">
          <p>
            一个开源的连续口语练习工具：涵盖「面接対策」「話題カード」「生活美語」等课程，
            支持日文 / 英文切换，提供关键词提示、示范朗读（Edge / Google 语音）与逐句跟读，
            并记录每日练习与连续签到。
          </p>
          <p>连续练习节奏，每天 3 分钟，让嘴巴动起来。</p>
        </div>

        <div className="about-rows">
          <div className="about-row">
            <span>作者</span>
            <b>fu shuai</b>
          </div>
          <div className="about-row">
            <span>项目地址</span>
            <a href={PROJECT_URL} target="_blank" rel="noreferrer">
              GitHub · fushuais
            </a>
          </div>
          <div className="about-row">
            <span>反馈邮箱</span>
            <a href={`mailto:${FEEDBACK_EMAIL}`}>发送邮件</a>
          </div>
        </div>

        <form className="about-feedback" onSubmit={sendFeedback}>
          <div className="about-feedback-title">意见反馈 · ご意見</div>
          <textarea
            className="about-feedback-input"
            rows="3"
            maxLength="1000"
            placeholder="想说的话：功能建议、bug、翻译修正… 点击发送后自动打开你的邮件应用"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary about-feedback-btn"
            disabled={!feedback.trim()}
          >
            发送反馈
          </button>
          <p className="about-feedback-hint">提交后自动打开你的邮件应用</p>
        </form>

        <button className="btn btn-primary about-close" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  )
}
