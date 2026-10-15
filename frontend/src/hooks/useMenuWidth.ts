import { useEffect, useRef } from 'react'

export function useMenuWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      el.style.setProperty('--trigger-width', `${el.getBoundingClientRect().width}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return ref
}
