import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthContext } from '@/context/auth/AuthContext'
import type { AuthContextType } from '@/context/auth/types'
import ThemeProvider from '@/context/theme/ThemeProvider'
import type { SessionUser } from '@/interfaces/SessionUser'

export const approver: SessionUser = {
  username: 'JSMITH',
  displayName: 'Smith, Jane',
  email: 'jane.smith@gov.bc.ca',
  identityProvider: 'idir',
  roles: ['ISP_APPROVER'],
}

export const authValue = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  status: 'signed-out',
  user: null,
  isConfigured: true,
  hasAnyRole: false,
  isAdmin: false,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

export const renderWithProviders = (
  ui: ReactElement,
  { auth = authValue(), path = '/' }: { auth?: AuthContextType; path?: string } = {},
) =>
  render(
    <AuthContext value={auth}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </AuthContext>,
  )
