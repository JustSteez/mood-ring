import { useEffect } from 'react'

const SETTLE_MS = 1400

/**
 * Fades elements marked with `data-reveal` up into place as they scroll into view.
 * Re-scans whenever `key` changes, so content that loads later is picked up too.
 */
export function useReveal(key: unknown) {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.in)')]
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          el.classList.add('in')
          // Once revealed, drop the stagger so hover effects respond instantly.
          window.setTimeout(() => el.style.setProperty('--delay', '0ms'), SETTLE_MS)
          observer.unobserve(e.target)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [key])
}
