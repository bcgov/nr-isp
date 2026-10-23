const LOGIN_DESTINATION_KEY = 'isp.login-destination'

export const clearLoginDestination = (): void => {
  window.sessionStorage.removeItem(LOGIN_DESTINATION_KEY)
}

/** A same-origin path saved before sign-in, so deep links survive the SSO round trip. */
export const getLoginDestination = (): string | null => {
  const destination = window.sessionStorage.getItem(LOGIN_DESTINATION_KEY)
  if (
    !destination?.startsWith('/') ||
    destination.startsWith('//') ||
    /[\\\r\n\t]/.test(destination)
  ) {
    return null
  }
  return destination
}

export const setLoginDestination = (destination?: string): void => {
  clearLoginDestination()
  if (destination && destination !== '/') {
    window.sessionStorage.setItem(LOGIN_DESTINATION_KEY, destination)
  }
}
