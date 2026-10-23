import { Tag } from '@carbon/react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth/useAuth'
import { fetchApiStatus } from '@/service/session-service'

const ROLE_LABELS: Record<string, string> = {
  ISP_ADMIN: 'Administrator',
  ISP_APPROVER: 'Approver',
}

type ApiStatus = 'checking' | 'up' | 'down'

const Home = () => {
  const { user } = useAuth()
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    let mounted = true
    fetchApiStatus()
      .then((response) => mounted && setApiStatus(response.status === 'UP' ? 'up' : 'down'))
      .catch(() => mounted && setApiStatus('down'))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="isp-page">
      <h1>Welcome{user?.displayName ? `, ${user.displayName}` : ''}</h1>
      <p className="isp-page__lead">Choose a page from the side navigation.</p>
      <dl className="isp-summary">
        <dt>Roles</dt>
        <dd>
          {user?.roles.map((role) => (
            <Tag key={role} type="blue">
              {ROLE_LABELS[role] ?? role}
            </Tag>
          ))}
        </dd>
        <dt>API</dt>
        <dd>
          {apiStatus === 'checking' && <Tag type="gray">Checking</Tag>}
          {apiStatus === 'up' && <Tag type="green">Available</Tag>}
          {apiStatus === 'down' && <Tag type="red">Unavailable</Tag>}
        </dd>
      </dl>
    </section>
  )
}

export default Home
