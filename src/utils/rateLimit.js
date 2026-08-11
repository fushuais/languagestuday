export function debounce(fn, wait = 300) {
  let timer = null
  let lastArgs = null
  let lastThis = null
  let cancelled = false

  const run = () => {
    if (cancelled) return
    timer = null
    fn.apply(lastThis, lastArgs)
    lastArgs = lastThis = null
  }

  const debounced = function (...args) {
    lastArgs = args
    lastThis = this
    cancelled = false
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, wait)
  }

  debounced.cancel = () => {
    cancelled = true
    if (timer) clearTimeout(timer)
    timer = null
  }

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
      run()
    }
  }

  return debounced
}

export function throttle(fn, limit = 200) {
  let last = 0
  let timer = null
  let lastArgs = null
  let lastThis = null
  const invoke = () => {
    last = Date.now()
    timer = null
    fn.apply(lastThis, lastArgs)
  }
  return function throttled(...args) {
    lastArgs = args
    lastThis = this
    const now = Date.now()
    const remaining = limit - (now - last)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      invoke()
    } else if (!timer) {
      timer = setTimeout(invoke, remaining)
    }
  }
}
