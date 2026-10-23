import { Button } from '@carbon/react'
import { useAuth } from '@/context/auth/useAuth'

const SessionError = () => {
  const { refresh, logout } = useAuth()
  return (
    <main className="isp-landing" id="main-content" role="alert">
      <h1 className="isp-landing__title">ISP is unavailable</h1>
      <p className="isp-landing__description">
        Your session could not be loaded. Try again in a moment.
      </p>
      <div className="isp-landing__actions">
        <Button kind="primary" onClick={() => void refresh()}>
          Try again
        </Button>
        <Button kind="ghost" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </main>
  )
}

export default SessionError
