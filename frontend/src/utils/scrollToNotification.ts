/**
 * Scrolling helper used when a validation or API error appears, so the user is always
 * taken to the message rather than left staring at an apparently unchanged screen.
 */

/** Height of the fixed Carbon header, so a scrolled-to element isn't hidden behind it. */
const HEADER_OFFSET_PX = 64

export type ScrollMode = 'page-top' | 'element'

/**
 * Brings a notification into view and moves focus to it.
 *
 * `page-top` scrolls to the top of the page, where every page renders its
 * PageNotifications region. `element` scrolls to the target itself, for banners that
 * deliberately live further down — the Sales Summary tabs keep their "add line item"
 * error beside the form it describes so the user doesn't lose the inputs they were
 * filling in.
 *
 * Scrolling is instant rather than smooth. A smooth scroll is cancelled outright by the
 * focus change that follows it, and by the browser's scroll anchoring as the new banner
 * changes the page height — which would leave the user looking at an unchanged screen,
 * the exact failure this helper exists to prevent. Instant is also the right behaviour
 * for anyone who has asked for reduced motion.
 *
 * Focus is moved as well as the scroll position: a scroll on its own is silent to screen
 * reader and keyboard users. Targets are expected to carry `tabIndex={-1}`.
 *
 * Does nothing while the user has focus in something they're actively editing. A
 * notification isn't always the result of an action the user just took — e.g. Sales
 * Summary's mill report flags can finish reloading in the background while the user is
 * mid-keystroke in an unrelated field — and yanking the scroll position and focus out
 * from under them at that moment is worse than a notification that waits until they're
 * not busy. This does not affect the normal click-a-button-and-get-an-error flow:
 * activating a button moves focus to the button first, so by the time an async result
 * comes back, `document.activeElement` is the button, not a field.
 */
const isActivelyEditing = (): boolean => {
  const active = document.activeElement as HTMLElement | null
  if (!active) return false
  return (
    active.isContentEditable ||
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.tagName === 'SELECT'
  )
}

export const scrollToNotification = (
  target?: HTMLElement | null,
  mode: ScrollMode = 'page-top',
): void => {
  if (isActivelyEditing()) {
    return
  }

  if (mode === 'element' && target) {
    const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  target?.focus({ preventScroll: true })
}
