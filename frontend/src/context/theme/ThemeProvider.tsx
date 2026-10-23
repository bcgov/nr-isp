import { Theme } from '@carbon/react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type UiTheme } from './ThemeContext'

const THEME_PREFERENCE_KEY = 'isp.ui.theme'

const readThemePreference = (): UiTheme => {
  try {
    return window.localStorage.getItem(THEME_PREFERENCE_KEY) === 'g100' ? 'g100' : 'white'
  } catch {
    return 'white'
  }
}

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<UiTheme>(readThemePreference)

  useEffect(() => {
    document.documentElement.setAttribute('data-carbon-theme', theme)
    try {
      window.localStorage.setItem(THEME_PREFERENCE_KEY, theme)
    } catch {
      // Theme preferences are optional when storage is unavailable.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'g100' ? 'white' : 'g100'))
  }, [])
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return (
    <ThemeContext value={value}>
      <Theme theme={theme}>{children}</Theme>
    </ThemeContext>
  )
}

export default ThemeProvider
