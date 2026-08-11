import { useEffect, useRef } from 'react'

export default function useShortcuts(handlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      )
        return
      const h = handlersRef.current[e.key]
      if (typeof h === 'function') {
        e.preventDefault()
        h(e)
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}