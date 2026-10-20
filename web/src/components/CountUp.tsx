import { useEffect, useRef, useState } from 'react'
import { useInView } from '../hooks/useInView'

const DURATION_MS = 1400

/** A number that counts up from zero the first time it scrolls into view. */
export function CountUp({ value, format = (n) => n.toLocaleString('en-US') }: { value: number; format?: (n: number) => string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4)
  const [shown, setShown] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }
    const start = performance.now()
    const begin = from.current
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS)
      const eased = 1 - Math.pow(1 - t, 4)
      setShown(Math.round(begin + (value - begin) * eased))
      if (t < 1) frame = requestAnimationFrame(step)
      else from.current = value
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, value])

  return <span ref={ref}>{format(shown)}</span>
}
