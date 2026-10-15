import { createContext } from 'react'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export type Toast = {
  id: string
  kind: ToastKind
  title: string
  subtitle?: string
}

export type NotificationContextType = {
  toasts: Toast[]
  /** Confirms a completed action, e.g. notifySuccess('Mill added'). */
  notifySuccess: (title: string, subtitle?: string) => void
  /**
   * Failures normally belong in a page-level InlineNotification (see PageNotifications) so they
   * persist until dismissed. Use this only where a page has no inline home for the message.
   */
  notifyError: (title: string, subtitle?: string) => void
  notifyWarning: (title: string, subtitle?: string) => void
  notifyInfo: (title: string, subtitle?: string) => void
  dismissToast: (id: string) => void
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)
