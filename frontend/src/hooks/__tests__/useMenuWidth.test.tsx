import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { useMenuWidth } from '@/hooks/useMenuWidth'

type ResizeCallback = (entries: unknown[], observer: unknown) => void

let observeSpy: ReturnType<typeof vi.fn>
let disconnectSpy: ReturnType<typeof vi.fn>
let lastCallback: ResizeCallback | null

class ResizeObserverMock {
  constructor(callback: ResizeCallback) {
    lastCallback = callback
  }
  observe = observeSpy
  unobserve = vi.fn()
  disconnect = disconnectSpy
}

const Menu = () => {
  const ref = useMenuWidth()
  return <div data-testid="trigger" ref={ref} />
}

describe('useMenuWidth', () => {
  let widthValue: number

  beforeEach(() => {
    observeSpy = vi.fn()
    disconnectSpy = vi.fn()
    lastCallback = null
    widthValue = 240
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      width: widthValue,
      height: 0,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets --trigger-width to the element width on mount and observes resizes', () => {
    const { getByTestId } = render(<Menu />)
    const trigger = getByTestId('trigger')

    expect(trigger.style.getPropertyValue('--trigger-width')).toBe('240px')
    expect(observeSpy).toHaveBeenCalledWith(trigger)
  })

  it('updates --trigger-width when the observed element resizes', () => {
    const { getByTestId } = render(<Menu />)
    const trigger = getByTestId('trigger')

    widthValue = 512
    lastCallback?.([], null)

    expect(trigger.style.getPropertyValue('--trigger-width')).toBe('512px')
  })

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Menu />)
    expect(disconnectSpy).not.toHaveBeenCalled()
    unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the ref is never attached to an element', () => {
    renderHook(() => useMenuWidth())
    expect(observeSpy).not.toHaveBeenCalled()
  })
})
