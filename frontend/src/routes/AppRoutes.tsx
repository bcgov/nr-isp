import { Loading } from '@carbon/react'
import type { ReactElement } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useAuth } from '@/context/auth/useAuth'
import AuthCallback from '@/pages/AuthCallback'
import Home from '@/pages/Home'
import Landing from '@/pages/Landing'
import NoAccess from '@/pages/NoAccess'
import NotFound from '@/pages/NotFound'
import NotPorted from '@/pages/NotPorted'
import SessionError from '@/pages/SessionError'
import { AUTH_CALLBACK_PATH } from '@/service/oidc-service'
import { NAVIGATION_ITEMS, isKnownAppPath } from '@/routes/navigation'

/** Ported pages by navigation path. A path without an entry shows the NotPorted placeholder. */
const PAGES: Partial<Record<string, ReactElement>> = {}

const SignedOutRoute = () => {
  const { pathname, search, hash } = useLocation()
  if (pathname === '/' || isKnownAppPath(pathname)) {
    return <Landing loginDestination={`${pathname}${search}${hash}`} />
  }
  return <NotFound />
}

const AppRoutes = () => {
  const { status, hasAnyRole } = useAuth()

  if (status === 'loading') {
    return <Loading withOverlay description="Loading session…" />
  }

  return (
    <Routes>
      <Route path={AUTH_CALLBACK_PATH} element={<AuthCallback />} />
      {status === 'signed-out' && <Route path="*" element={<SignedOutRoute />} />}
      {status === 'error' && <Route path="*" element={<SessionError />} />}
      {status === 'signed-in' && !hasAnyRole && <Route path="*" element={<NoAccess />} />}
      {status === 'signed-in' && hasAnyRole && (
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {NAVIGATION_ITEMS.map((item) => (
            <Route
              key={item.path}
              path={`${item.path}/*`}
              element={PAGES[item.path] ?? <NotPorted title={item.label} />}
            />
          ))}
          <Route path="*" element={<NotFound inLayout />} />
        </Route>
      )}
    </Routes>
  )
}

export default AppRoutes
