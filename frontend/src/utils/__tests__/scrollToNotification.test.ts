import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scrollToNotification } from '@/utils/scrollToNotification'

describe('scrollToNotification', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollToSpy = vi.fn()
    Object.defineProperty(window, 'scrollTo', { writable: true, value: scrollToSpy })
    document.body.innerHTML = ''
    // Ensure nothing is focused from a previous test.
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('scrolls to the top of the page by default and focuses the target without scrolling', () => {
    const target = document.createElement('div')
    target.tabIndex = -1
    document.body.appendChild(target)
    const focusSpy = vi.spyOn(target, 'focus')

    scrollToNotification(target)

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('scrolls to the top when called with no target', () => {
    scrollToNotification()
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('scrolls to the element minus the header offset in element mode', () => {
    const target = document.createElement('div')
    target.tabIndex = -1
    document.body.appendChild(target)
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 500,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 500,
      toJSON: () => ({}),
    })
    const focusSpy = vi.spyOn(target, 'focus')

    scrollToNotification(target, 'element')

    // 500 (rect top) + 0 (scrollY) - 64 (header offset)
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 436, behavior: 'auto' })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('clamps a negative computed position to 0 in element mode', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 10,
      toJSON: () => ({}),
    })

    scrollToNotification(target, 'element')

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('falls back to page-top when element mode is requested without a target', () => {
    scrollToNotification(null, 'element')
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('does nothing while the user is editing an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const target = document.createElement('div')
    document.body.appendChild(target)
    const focusSpy = vi.spyOn(target, 'focus')

    scrollToNotification(target)

    expect(scrollToSpy).not.toHaveBeenCalled()
    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('does nothing while the user is editing a textarea', () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    scrollToNotification()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('does nothing while the user is in a select', () => {
    const select = document.createElement('select')
    document.body.appendChild(select)
    select.focus()

    scrollToNotification()

    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it('scrolls when focus is on a non-editing element such as a button', () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.focus()

    scrollToNotification()

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })
})
