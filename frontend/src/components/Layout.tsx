import { Asleep, Light, Logout } from '@carbon/icons-react'
import {
  Content,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
} from '@carbon/react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import ToastRegion from '@/components/common/ToastRegion/ToastRegion'
import { useAuth } from '@/context/auth/useAuth'
import { NotificationProvider } from '@/context/notification/NotificationProvider'
import { useTheme } from '@/context/theme/useTheme'
import { NAVIGATION, type NavigationItem } from '@/routes/navigation'

const isActivePath = (pathname: string, item: NavigationItem) =>
  pathname === item.path || pathname.startsWith(`${item.path}/`)

const Layout = () => {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(true)
  const isDark = theme === 'g100'

  return (
    <NotificationProvider>
      <Header aria-label="Interior Selling Price Application (ISP)">
        <SkipToContent />
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
          isActive={isSideNavExpanded}
          isCollapsible
          onClick={() => setIsSideNavExpanded((expanded) => !expanded)}
        />
        <HeaderName as={Link} to="/" prefix="Interior Selling Price Application">
          (ISP)
        </HeaderName>
        <HeaderGlobalBar>
          {user?.displayName && <span className="isp-header__user">{user.displayName}</span>}
          <HeaderGlobalAction
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            {isDark ? <Light size={20} /> : <Asleep size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Log out" onClick={() => void logout()}>
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
        <SideNav
          aria-label="Side navigation"
          expanded={isSideNavExpanded}
          isPersistent={isSideNavExpanded}
          isChildOfHeader
        >
          <SideNavItems>
            {NAVIGATION.map((section) =>
              section.label ? (
                <SideNavMenu
                  key={section.label}
                  title={section.label}
                  defaultExpanded
                  isActive={section.items.some((item) => isActivePath(pathname, item))}
                >
                  {section.items.map((item) => (
                    <SideNavMenuItem
                      key={item.path}
                      as={Link}
                      to={item.path}
                      isActive={isActivePath(pathname, item)}
                    >
                      {item.label}
                    </SideNavMenuItem>
                  ))}
                </SideNavMenu>
              ) : (
                section.items.map((item) => (
                  <SideNavLink
                    key={item.path}
                    as={Link}
                    to={item.path}
                    isActive={isActivePath(pathname, item)}
                  >
                    {item.label}
                  </SideNavLink>
                ))
              ),
            )}
          </SideNavItems>
        </SideNav>
      </Header>
      <Content
        id="main-content"
        className={isSideNavExpanded ? 'isp-content isp-content--nav-expanded' : 'isp-content'}
      >
        <Outlet />
      </Content>
      <ToastRegion />
    </NotificationProvider>
  )
}

export default Layout
