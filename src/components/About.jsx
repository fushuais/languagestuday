const PROJECT_URL = 'https://github.com/fushuais'

export default function About({ onClose }) {
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
        </div>

        <button className="btn btn-primary about-close" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  )
}
