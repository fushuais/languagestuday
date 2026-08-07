import useEdgeStatus from '../hooks/useEdgeStatus.js'

export default function EdgeStatusBadge() {
  const status = useEdgeStatus(true)

  if (status === 'unknown') {
    return (
      <span className="edge-status unknown" title="正在检测 Edge 神经语音连接…">
        ⏳ Edge…
      </span>
    )
  }
  if (status === 'fallback') {
    return (
      <span className="edge-status fallback" title="Edge 神经语音不可用，已自动回退到网络/系统语音">
        ⚠️ Edge 回退
      </span>
    )
  }
  return (
    <span className="edge-status ok" title="Edge 神经语音已连接">
      ⚡ Edge
    </span>
  )
}
