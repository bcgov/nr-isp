import { Login } from '@carbon/icons-react'
import { Button, InlineNotification } from '@carbon/react'
import { useState } from 'react'
import { clearLoginDestination, setLoginDestination } from '@/context/auth/login-destination'
import { useAuth } from '@/context/auth/useAuth'
import { useTheme } from '@/context/theme/useTheme'
import logo from '@/assets/BCID_H_rgb_pos.png'
import reverseLogo from '@/assets/gov-bc-logo-horiz.png'

const Landing = ({ loginDestination }: { loginDestination?: string }) => {
  const { isConfigured, login } = useAuth()
  const { theme } = useTheme()
  const [errorMessage, setErrorMessage] = useState('')

  const onLogin = async () => {
    setErrorMessage('')
    setLoginDestination(loginDestination)
    try {
      await login()
    } catch (error) {
      clearLoginDestination()
      console.error(error)
      setErrorMessage('Unable to start the login flow.')
    }
  }

  return (
    <main className="isp-landing" id="main-content">
      <img
        className="isp-landing__logo"
        src={theme === 'g100' ? reverseLogo : logo}
        alt="Government of British Columbia"
      />
      <h1 className="isp-landing__title">ISP</h1>
      <h2 className="isp-landing__subtitle">Interior Selling Price</h2>
      <p className="isp-landing__description">
        Review mill sales summary submissions, maintain reference data and run ISP reports.
      </p>
      {errorMessage && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Login failed"
          subtitle={errorMessage}
          onCloseButtonClick={() => setErrorMessage('')}
        />
      )}
      <Button
        kind="primary"
        size="lg"
        renderIcon={Login}
        onClick={() => void onLogin()}
        disabled={!isConfigured}
      >
        Log in with IDIR
      </Button>
      {!isConfigured && (
        <p className="isp-landing__help">
          ISP login is not configured for this environment. Contact the system administrator.
        </p>
      )}
    </main>
  )
}

export default Landing
