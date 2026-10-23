import { Button } from '@carbon/react'
import { useAuth } from '@/context/auth/useAuth'

const NoAccess = () => {
  const { logout } = useAuth()
  return (
    <main className="isp-landing" id="main-content">
      <h1 className="isp-landing__title">No ISP access</h1>
      <p className="isp-landing__description">
        Your IDIR account does not have an ISP role. Ask your ISP administrator to grant you the
        Administrator or Approver role in FAM, then log in again.
      </p>
      <Button kind="secondary" onClick={() => void logout()}>
        Log out
      </Button>
    </main>
  )
}

export default NoAccess
