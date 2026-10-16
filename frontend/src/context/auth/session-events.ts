export const SESSION_EXPIRED_EVENT = 'isp:session-expired'

export const notifySessionExpired = (): void => {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}
