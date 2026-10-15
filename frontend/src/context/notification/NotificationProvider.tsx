import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  NotificationContext,
  type Toast,
  type ToastKind,
} from '@/context/notification/NotificationContext'

/**
 * Most toasts shown at once. A burst of rapid actions (e.g. saving several rows in a row) drops
 * the oldest rather than stacking a wall of notifications down the screen.
 */
const MAX_TOASTS = 4

/**
 * Ids come from a monotonic counter rather than a clock: two actions completing in the same
 * millisecond would otherwise collide and React would reuse the wrong element.
 */
let toastSequence = 0
const nextToastId = (): string => `isp-toast-${++toastSequence}`

/** Action confirmations shown by ToastRegion, ported from the CGI rebuild. */
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((kind: ToastKind, title: string, subtitle?: string) => {
    setToasts((prev) => [...prev, { id: nextToastId(), kind, title, subtitle }].slice(-MAX_TOASTS))
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  // Stable across new toasts, so pages can list them as effect dependencies.
  const notifiers = useMemo(
    () => ({
      notifySuccess: (title: string, subtitle?: string) => push('success', title, subtitle),
      notifyError: (title: string, subtitle?: string) => push('error', title, subtitle),
      notifyWarning: (title: string, subtitle?: string) => push('warning', title, subtitle),
      notifyInfo: (title: string, subtitle?: string) => push('info', title, subtitle),
    }),
    [push],
  )

  const value = useMemo(
    () => ({ toasts, ...notifiers, dismissToast }),
    [toasts, notifiers, dismissToast],
  )

  return <NotificationContext value={value}>{children}</NotificationContext>
}
