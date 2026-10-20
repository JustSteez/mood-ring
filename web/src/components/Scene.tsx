import { useEffect, useRef } from 'react'

/**
 * Fixed WebGL backdrop: a metal ring whose stone glows in today's mood colour,
 * two orbit lines and a starfield. Scroll moves the camera and turns the ring.
 * three.js is loaded lazily so the page paints before the scene does.
 */
export function Scene({ color }: { color: string }) {
  const host = useRef<HTMLDivElement>(null)
  const setColor = useRef<(c: string) => void>(() => {})

  useEffect(() => {
    setColor.current(color)
  }, [color])

  useEffect(() => {
    const el = host.current
    if (!el) return
    let disposed = false
    let cleanup = () => {}

    import('./scene/createScene')
      .then(({ createScene }) => {
        if (disposed) return
        const scene = createScene(el, color)
        setColor.current = scene.setColor
        cleanup = scene.dispose
        el.classList.add('ready')
      })
      .catch((e) => console.error('3D scene failed to load', e))

    return () => {
      disposed = true
      cleanup()
    }
    // The colour is pushed through setColor, so the scene is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={host} className="scene" aria-hidden="true" />
}
