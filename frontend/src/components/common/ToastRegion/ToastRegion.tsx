import React from 'react'
import { ToastNotification } from '@carbon/react'
import { useNotifications } from '@/context/notification/useNotifications'
import './ToastRegion.scss'

/** How long a toast stays on screen before Carbon auto-closes it. */
const TOAST_TIMEOUT_MS = 5000

/**
 * Floating region that renders the app's action confirmations, mounted once in
 * Layout so every signed-in page shares it.
 *
 * Accessibility: each Carbon ToastNotification already carries `role="status"`, which
 * screen readers announce when the node is inserted. The wrapper deliberately does NOT
 * add its own `aria-live` — nesting live regions makes some readers announce twice.
 */
const ToastRegion: React.FC = () => {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="isp-toast-region">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          className="isp-toast-region__toast"
          kind={toast.kind}
          title={toast.title}
          subtitle={toast.subtitle}
          timeout={TOAST_TIMEOUT_MS}
          onClose={(): void => dismissToast(toast.id)}
          statusIconDescription={`${toast.kind} notification`}
        />
      ))}
    </div>
  )
}

export default ToastRegion
