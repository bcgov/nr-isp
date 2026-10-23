import type { Ref } from 'react'
import { InlineNotification } from '@carbon/react'

export type PageNotificationKind = 'error' | 'warning' | 'info' | 'success'

export interface PageNotification {
  id: string
  kind?: PageNotificationKind
  title?: string
  subtitle: string
}

interface PageNotificationsProps {
  /** The keyed error map most pages already hold (`Record<rowId, message | null>`). */
  errors?: Record<string, string | null | undefined>
  /** Explicit list, for pages whose messages aren't keyed by row. Wins over `errors`. */
  notifications?: PageNotification[]
  /** Banner heading for a given key. Defaults to 'Error'. */
  titleFor?: (key: string) => string
  onDismiss?: (key: string) => void
  ref?: Ref<HTMLDivElement>
}

/**
 * The single error region every page renders above its heading, and the scroll/focus
 * target for useScrollToTopOnError.
 */
const PageNotifications = ({
  errors,
  notifications,
  titleFor,
  onDismiss,
  ref,
}: PageNotificationsProps) => {
  const items: PageNotification[] =
    notifications ??
    Object.entries(errors ?? {})
      .filter(([, message]) => !!message)
      .map(([key, message]) => ({
        id: key,
        kind: 'error' as const,
        title: titleFor?.(key) ?? 'Error',
        subtitle: message ?? '',
      }))

  // Rendered even when empty so it stays a stable scroll and focus target — pages
  // capture the ref before the first error ever appears.
  return (
    <div ref={ref} tabIndex={-1} className="isp-page-notifications">
      {items.map((item) => (
        <div key={item.id} style={{ marginBottom: '1rem' }}>
          <InlineNotification
            kind={item.kind ?? 'error'}
            title={item.title ?? 'Error'}
            subtitle={item.subtitle}
            onClose={(): void => onDismiss?.(item.id)}
            style={{ maxWidth: '100%' }}
          />
        </div>
      ))}
    </div>
  )
}

export default PageNotifications
