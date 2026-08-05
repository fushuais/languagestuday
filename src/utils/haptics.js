let enabled = true

function canVibrate() {
  return enabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function setHapticsEnabled(v) {
  enabled = !!v
}

export function tap() {
  if (!canVibrate()) return
  try {
    navigator.vibrate(8)
  } catch {
    // ignore
  }
}

export function success() {
  if (!canVibrate()) return
  try {
    navigator.vibrate([15, 40, 15])
  } catch {
    // ignore
  }
}

export function warning() {
  if (!canVibrate()) return
  try {
    navigator.vibrate([30, 50, 30])
  } catch {
    // ignore
  }
}
