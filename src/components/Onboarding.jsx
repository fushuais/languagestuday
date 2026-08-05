import { useState } from 'react'

const KEY = 'nihongo-onboarded-v1'

export function shouldOnboard(hasRecords) {
  if (typeof window === 'undefined') return false
  try {
    return !localStorage.getItem(KEY)
  } catch {
    return false
  }
}

function done() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // ignore
  }
}

const SHORTCUTS = [
  { k: 'Space', d: '開始 / 話した（＋1句）' },
  { k: 'P', d: '一時停止 / 再開' },
  { k: 'H', d: 'ヒントを出す' },
  { k: 'N', d: '次の話題へ' },
  { k: 'R', d: 'リセット' },
]

export default function Onboarding({ onClose }) {
  const [step, setStep] = useState(0)

  const finish = () => {
    done()
    onClose()
  }

  return (
    <div className="onboard-overlay" onClick={finish}>
      <div className="onboard-card" onClick={(e) => e.stopPropagation()}>
        {step === 0 && (
          <>
            <div className="onboard-icon">🗣️</div>
            <h2>ようこそ！日本語スピーキングへ</h2>
            <p>
              每天 3 分钟，用「連続練習」让嘴巴动起来。
              选一个话题 → 准备（听关键词/范文）→ 倒计时后开口连续说。
            </p>
            <div className="onboard-steps">
              <span className="onboard-step active">1</span>
              <span className="onboard-step">2</span>
              <span className="onboard-step">3</span>
            </div>
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              次へ →
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <div className="onboard-icon">⌨️</div>
            <h2>键盘快捷键 · 练习更专注</h2>
            <div className="onboard-shortcuts">
              {SHORTCUTS.map((s) => (
                <div key={s.k} className="onboard-shortcut">
                  <kbd>{s.k}</kbd>
                  <span>{s.d}</span>
                </div>
              ))}
            </div>
            <div className="mobile-only-note">
              📱 手机上无需键盘：练习时用屏幕底部「話した！」按钮即可
            </div>
            <div className="onboard-steps">
              <span className="onboard-step done">✓</span>
              <span className="onboard-step active">2</span>
              <span className="onboard-step">3</span>
            </div>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              次へ →
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <div className="onboard-icon">🎯</div>
            <h2>坚持就是胜利</h2>
            <p>
              每天完成目标分钟数会积累「🔥 连续签到」。
              「練習記録」里有 7 日趋势图、每日推荐话题。
              卡住时按 <kbd>H</kbd>（或点底部 💡）看提示，别停口！
            </p>
            <div className="onboard-steps">
              <span className="onboard-step done">✓</span>
              <span className="onboard-step done">✓</span>
              <span className="onboard-step active">3</span>
            </div>
            <button className="btn btn-primary" onClick={finish}>
              🚀 はじめる！
            </button>
          </>
        )}
      </div>
    </div>
  )
}
