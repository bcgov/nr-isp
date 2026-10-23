import { ErrorResponse, UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'
import { env } from '@/env'

export const AUTH_CALLBACK_PATH = '/authCallback'
export const isOidcConfigured = (): boolean =>
  Boolean(env.VITE_OIDC_ISSUER_URI?.trim() && env.VITE_OIDC_CLIENT_ID?.trim())

let manager: UserManager | undefined
let generation = 0
let signedOut = false
let renewal: Promise<User | null> | undefined
let callback: Promise<User> | undefined
let logout: Promise<void> | undefined

export const getUserManager = (): UserManager => {
  if (!manager) {
    manager = new UserManager({
      authority: env.VITE_OIDC_ISSUER_URI?.trim() ?? '',
      client_id: env.VITE_OIDC_CLIENT_ID?.trim() ?? '',
      redirect_uri: `${window.location.origin}${AUTH_CALLBACK_PATH}`,
      post_logout_redirect_uri: window.location.origin,
      response_type: 'code',
      scope: 'openid profile email',
      // Tokens stay in this tab only, as in nr-lexis.
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
      automaticSilentRenew: false,
      loadUserInfo: false,
    })
  }
  return manager
}

class SessionNotRenewableError extends Error {
  constructor() {
    super('The session cannot be renewed.')
    this.name = 'SessionNotRenewableError'
  }
}

// SSO answers invalid_grant when the refresh token is expired or revoked, or its session has ended.
const isRefreshTokenRejected = (error: unknown): boolean =>
  error instanceof ErrorResponse && error.error === 'invalid_grant'

// Whether a renewal failure means the session is over. Anything else, such as a network failure
// or a temporary SSO error, may succeed on a later attempt and must not sign the user out.
export const isSessionEnded = (error: unknown): boolean =>
  error instanceof SessionNotRenewableError || isRefreshTokenRejected(error)

// Startup and API requests share this renewal: a rotating refresh token must never be spent by
// competing callers.
export const getOidcUser = async ({
  forceRefresh = false,
}: { forceRefresh?: boolean } = {}): Promise<User | null> => {
  if (!isOidcConfigured() || signedOut) return null
  const started = generation
  if (renewal) return renewal
  const user = await getUserManager().getUser()
  if (started !== generation || signedOut || !user) return null
  if (!forceRefresh && user.expires_in !== undefined && user.expires_in > 60) return user
  if (renewal) return renewal

  const attempt = (async () => {
    if (!user.refresh_token) throw new SessionNotRenewableError()
    const refreshed = await getUserManager().signinSilent()
    if (started !== generation || signedOut) {
      // oidc-client-ts stores the result before resolving; discard a result that lands after
      // logout as well as refusing to publish it.
      await logout?.catch(() => undefined)
      await getUserManager().removeUser()
      return null
    }
    return refreshed
  })()
  renewal = attempt
  try {
    return await attempt
  } finally {
    if (renewal === attempt) renewal = undefined
  }
}

// Startup discards a session whose refresh token is missing or rejected. Other failures keep it so
// a reload can still recover the session.
export const restoreOidcUser = async (): Promise<User | null> => {
  try {
    return await getOidcUser()
  } catch (error) {
    if (isSessionEnded(error)) {
      await getUserManager()
        .removeUser()
        .catch(() => undefined)
    }
    return null
  }
}

/** ISP is a staff application: sign-in goes straight to IDIR. */
export const startOidcLogin = async (): Promise<void> => {
  if (!isOidcConfigured()) throw new Error('ISP login is not configured.')
  await renewal?.catch(() => null)
  signedOut = false
  logout = undefined
  await getUserManager().signinRedirect({
    extraQueryParams: { kc_idp_hint: env.VITE_OIDC_IDIR_HINT?.trim() || 'azureidir' },
  })
}

// Shared across React StrictMode remounts: an authorization code is single-use.
export const completeOidcLogin = (): Promise<User> => {
  if (!callback) {
    const started = generation
    callback = (async () => {
      const user = await getUserManager().signinRedirectCallback()
      if (started !== generation || signedOut) {
        await getUserManager().removeUser()
        throw new Error('The session ended during login.')
      }
      return user
    })()
  }
  return callback
}

// Built from the configured realm rather than discovered, so sign-out never waits on a network
// request that can fail.
export const buildEndSessionUrl = (idTokenHint?: string): string => {
  const issuer = env.VITE_OIDC_ISSUER_URI?.trim().replace(/\/+$/, '') ?? ''
  const params = new URLSearchParams({
    client_id: env.VITE_OIDC_CLIENT_ID?.trim() ?? '',
    post_logout_redirect_uri: window.location.origin,
  })
  if (idTokenHint) params.set('id_token_hint', idTokenHint)
  return `${issuer}/protocol/openid-connect/logout?${params}`
}

// Resolves once the browser is navigating away, so a renewal that finishes during sign-out can
// still discard what it stored before the page unloads.
export const endOidcSession = (
  navigate: (url: string) => void = (url) => window.location.assign(url),
): Promise<void> => {
  if (logout) return logout
  signedOut = true
  generation += 1
  logout = (async () => {
    try {
      const user = await getUserManager().getUser()
      const endSessionUrl = buildEndSessionUrl(user?.id_token)
      await getUserManager().removeUser()
      navigate(endSessionUrl)
    } catch (error) {
      await getUserManager()
        .removeUser()
        .catch(() => undefined)
      logout = undefined
      throw error
    }
  })()
  return logout
}
