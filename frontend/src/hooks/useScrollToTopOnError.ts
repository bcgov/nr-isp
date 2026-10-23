import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'
import type { ScrollMode } from '@/utils/scrollToNotification'
import { scrollToNotification } from '@/utils/scrollToNotification'

/**
 * The error shapes pages already hold: a single message, or the keyed map used by every
 * page that edits table rows (`Record<rowId, message | null>`).
 */
export type ErrorSource = string | null | undefined | Record<string, string | null | undefined>

/** Separator between messages in the change-detection signal. */
const SEPARATOR = '\u0000'

const collectMessages = (source: ErrorSource | ErrorSource[]): string[] => {
  const sources = Array.isArray(source) ? source : [source]
  const messages: string[] = []

  sources.forEach((entry) => {
    if (!entry) return
    if (typeof entry === 'string') {
      messages.push(entry)
      return
    }
    Object.entries(entry)
      .filter(([, message]) => !!message)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, message]) => messages.push(`${key}: ${message ?? ''}`))
  })

  return messages
}

const toEntries = (source: ErrorSource | ErrorSource[]): ErrorSource[] =>
  Array.isArray(source) ? source : [source]

/**
 * Scrolls the user to a page's error notification whenever a *new* error appears.
 *
 * Pages call this once against the error state they already own, instead of scattering
 * scroll calls through every catch block — one call per page can't silently miss a
 * failure path the way thirty hand-placed calls can.
 *
 * A genuinely new message triggers a scroll, and so does a repeat of the exact same
 * message where the underlying error object was freshly re-set (e.g. the user saves the
 * same invalid row a second time) — text alone can't tell that apart from an old,
 * unaddressed error still sitting on screen while something unrelated re-renders the page.
 * Dismissing one of several errors, or clearing them, leaves the user where they are.
 *
 * @param source the page's error state
 * @param target the notification region, focused so screen readers announce the message
 * @param mode 'page-top' (default) scrolls to the top of the page; 'element' scrolls to
 *        the target itself, for banners that deliberately sit further down the page
 */
export const useScrollToTopOnError = (
  source: ErrorSource | ErrorSource[],
  target?: RefObject<HTMLElement | null>,
  mode: ScrollMode = 'page-top',
): void => {
  const signal = collectMessages(source).join(SEPARATOR)

  // Seeded from the first render so an error already present at mount doesn't scroll.
  const seenRef = useRef<Set<string>>(new Set(signal ? signal.split(SEPARATOR) : []))
  // A page's `errors` map is replaced with a *new* object on every setErrors call, even
  // when the resulting message text is unchanged — e.g. saving the same invalid row twice
  // in a row. Text alone can't tell that apart from "this old error is still sitting here
  // and something unrelated re-rendered the page", so for object-shaped entries we track
  // each one's own identity across renders as well: a fresh object carrying the same
  // messages means a fresh attempt. A fresh object with fewer messages is a dismissal.
  const entryRefsRef = useRef<ErrorSource[]>(toEntries(source))

  useEffect(() => {
    const entries = toEntries(source)
    const messages = signal ? signal.split(SEPARATOR) : []
    const anyEntryReplaced = entries.some(
      (entry, index) =>
        typeof entry === 'object' && entry !== null && entry !== entryRefsRef.current[index],
    )
    const seen = seenRef.current
    const hasUnseenMessage = messages.some((message) => !seen.has(message))
    const isRetry = anyEntryReplaced && !hasUnseenMessage && new Set(messages).size === seen.size
    const hasNewMessage = messages.length > 0 && (hasUnseenMessage || isRetry)

    seenRef.current = new Set(messages)
    entryRefsRef.current = entries

    if (hasNewMessage) {
      scrollToNotification(target?.current, mode)
    }
  }, [signal, source, target, mode])
}
