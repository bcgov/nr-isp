import { Button } from '@carbon/react'
import { useNavigate } from 'react-router-dom'

/** Inside the signed-in layout the page sits in Carbon's main Content, so it must not add another main. */
const NotFound = ({ inLayout = false }: { inLayout?: boolean }) => {
  const navigate = useNavigate()
  const Container = inLayout ? 'section' : 'main'
  return (
    <Container
      className={inLayout ? 'isp-page' : 'isp-landing'}
      id={inLayout ? undefined : 'main-content'}
    >
      <h1 className={inLayout ? undefined : 'isp-landing__title'}>404</h1>
      <p className={inLayout ? 'isp-page__lead' : 'isp-landing__description'}>
        The page you are looking for does not exist.
      </p>
      <Button kind="primary" onClick={() => navigate('/')}>
        Back home
      </Button>
    </Container>
  )
}

export default NotFound
