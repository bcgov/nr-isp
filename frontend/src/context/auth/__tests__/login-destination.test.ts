import { describe, expect, it } from 'vitest'
import {
  clearLoginDestination,
  getLoginDestination,
  setLoginDestination,
} from '@/context/auth/login-destination'

describe('login-destination', () => {
  it('round-trips a same-origin path', () => {
    setLoginDestination('/isp-inbox?status=INB')
    expect(getLoginDestination()).toBe('/isp-inbox?status=INB')
    clearLoginDestination()
    expect(getLoginDestination()).toBeNull()
  })

  it('does not store the home page', () => {
    setLoginDestination('/')
    expect(getLoginDestination()).toBeNull()
  })

  it.each(['//evil.example', 'https://evil.example', '/path\\with-backslash', 'relative'])(
    'ignores the unsafe destination %s',
    (destination) => {
      window.sessionStorage.setItem('isp.login-destination', destination)
      expect(getLoginDestination()).toBeNull()
    },
  )
})
