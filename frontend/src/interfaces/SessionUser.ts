export type IspRole = 'ISP_ADMIN' | 'ISP_APPROVER'

/** GET /api/session/me */
export type SessionUser = {
  username: string | null
  displayName: string | null
  email: string | null
  identityProvider: string | null
  roles: IspRole[]
}
