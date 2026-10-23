import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ErrorSource } from '@/hooks/useScrollToTopOnError'
import { useScrollToTopOnError } from '@/hooks/useScrollToTopOnError'

describe('useScrollToTopOnError', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollToSpy = vi.fn()
    Object.defineProperty(window, 'scrollTo', { writable: true, value: scrollToSpy })
    document.body.innerHTML = ''
  })

  const render = (initial: ErrorSource | ErrorSource[]) =>
    renderHook(
      ({ source }: { source: ErrorSource | ErrorSource[] }) => useScrollToTopOnError(source),
      {
        initialProps: { source: initial },
      },
    )

  it('does not scroll when there is no error', () => {
    const { rerender } = render(null)
    rerender({ source: undefined })
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('does not scroll for an error already present at mount', () => {
    const { rerender } = render('preexisting error')
    rerender({ source: 'preexisting error' })
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('scrolls when a new error message appears', () => {
    const { rerender } = render(null)
    rerender({ source: 'save failed' })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('does not scroll again when the same string error re-renders', () => {
    const { rerender } = render(null)
    rerender({ source: 'save failed' })
    rerender({ source: 'save failed' })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
  })

  it('scrolls again when a different message appears', () => {
    const { rerender } = render(null)
    rerender({ source: 'first error' })
    rerender({ source: 'second error' })
    expect(scrollToSpy).toHaveBeenCalledTimes(2)
  })

  it('does not scroll when the error is cleared', () => {
    const { rerender } = render('some error')
    rerender({ source: null })
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('scrolls when a keyed error map gains a message', () => {
    const { rerender } = render({})
    rerender({ source: { 'row-1': 'invalid volume' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
  })

  it('scrolls again when the error map is replaced with a fresh object carrying the same text', () => {
    const { rerender } = render(null)
    rerender({ source: { 'row-1': 'invalid volume' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)

    // The user saves the same invalid row again: same words, new object.
    rerender({ source: { 'row-1': 'invalid volume' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(2)
  })

  it('does not scroll when one of several errors is dismissed', () => {
    const { rerender } = render(null)
    rerender({ source: { 'row-1': 'invalid volume', 'row-2': 'invalid date' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)

    // Dismissing a banner replaces the map with one that has fewer messages.
    rerender({ source: { 'row-1': null, 'row-2': 'invalid date' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
  })

  it('scrolls when a replaced map swaps one message for a new one', () => {
    const { rerender } = render(null)
    rerender({ source: { 'row-1': 'invalid volume', 'row-2': 'invalid date' } })
    rerender({ source: { 'row-1': null, 'row-2': 'invalid date', 'row-3': 'duplicate name' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(2)
  })

  it('does not scroll when the identical map object re-renders', () => {
    const errors = { 'row-1': 'invalid volume' }
    const { rerender } = render(null)
    rerender({ source: errors })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
    rerender({ source: errors })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
  })

  it('orders multiple keyed messages deterministically and scrolls once', () => {
    const { rerender } = render(null)
    rerender({ source: { 'row-2': 'second row error', 'row-1': 'first row error' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
    // Same object, same keys: no further scroll.
    rerender({ source: { 'row-2': 'second row error', 'row-1': 'first row error' } })
    expect(scrollToSpy).toHaveBeenCalledTimes(2)
  })

  it('ignores null-valued entries in the error map', () => {
    const { rerender } = render(null)
    rerender({ source: { 'row-1': null, 'row-2': undefined } })
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('supports an array of mixed error sources', () => {
    const { rerender } = render([null, {}])
    rerender({ source: ['page error', { 'row-1': 'row error' }] })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)
  })

  it('focuses the target element when provided', () => {
    const target = document.createElement('div')
    target.tabIndex = -1
    document.body.appendChild(target)
    const focusSpy = vi.spyOn(target, 'focus')
    const ref = { current: target as HTMLElement | null }

    const { rerender } = renderHook(
      ({ source }: { source: ErrorSource }) => useScrollToTopOnError(source, ref),
      {
        initialProps: { source: null as ErrorSource },
      },
    )
    rerender({ source: 'boom' })

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('scrolls to the element itself in element mode', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 300,
      toJSON: () => ({}),
    })
    const ref = { current: target }

    const { rerender } = renderHook(
      ({ source }: { source: ErrorSource }) => useScrollToTopOnError(source, ref, 'element'),
      { initialProps: { source: null as ErrorSource } },
    )
    rerender({ source: 'lower banner error' })

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 236, behavior: 'auto' })
  })
})
