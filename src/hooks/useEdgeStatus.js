import { useEffect, useState } from 'react'
import { checkEdgeAvailability, edgeStatus, subscribeEdgeStatus } from '../utils/speech.js'

export default function useEdgeStatus(autoCheck = true) {
  const [status, setStatus] = useState(edgeStatus)
  useEffect(() => {
    const un = subscribeEdgeStatus(setStatus)
    if (autoCheck) checkEdgeAvailability()
    return un
  }, [autoCheck])
  return status
}
