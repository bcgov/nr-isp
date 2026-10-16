import { Loading } from '@carbon/react'
import { useEffect } from 'react'
import { clearLoginDestination, getLoginDestination } from '@/context/auth/login-destination'
import { completeOidcLogin } from '@/service/oidc-service'

/** Finishes the authorization-code exchange, then reloads the app at the saved destination. */
const AuthCallback = () => {
  useEffect(() => {
    let mounted = true
    void completeOidcLogin()
      .then(() => {
        if (!mounted) return
        const destination = getLoginDestination() ?? '/'
        clearLoginDestination()
        window.location.replace(destination)
      })
      .catch(() => {
        if (!mounted) return
        clearLoginDestination()
        window.location.replace('/')
      })
    return () => {
      mounted = false
    }
  }, [])
  return <Loading withOverlay description="Completing login…" />
}

export default AuthCallback
