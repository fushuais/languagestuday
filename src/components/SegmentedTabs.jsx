import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { tap } from '../utils/haptics.js'
import { throttle } from '../utils/rateLimit.js'

export default function SegmentedTabs({ items, active, onChange }) {
  const listRef = useRef(null)
  const btnRefs = useRef([])
  const [thumb, setThumb] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)

  const update = () => {
    const idx = Math.max(0, items.findIndex((it) => it.id === active))
    const btn = btnRefs.current[idx]
    const list = listRef.current
    if (btn && list) {
      setThumb({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
  }

  useEffect(() => {
    update()
    const ro = new ResizeObserver(update)
    if (listRef.current) ro.observe(listRef.current)
    const onResize = throttle(update, 120)
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    update()
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [active, items]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="tabs" ref={listRef} role="tablist" aria-label="view navigation">
      <span
        className={`tab-thumb ${ready ? 'anim' : ''}`}
        style={{ left: thumb.left, width: thumb.width }}
        aria-hidden="true"
      />
      {items.map((it, i) => (
        <button
          key={it.id}
          ref={(el) => {
            btnRefs.current[i] = el
          }}
          className={`tab-btn ${active === it.id ? 'active' : ''}`}
          onClick={() => {
            tap()
            onChange(it.id)
          }}
          role="tab"
          aria-selected={active === it.id}
        >
          {it.label}
        </button>
      ))}
    </nav>
  )
}
