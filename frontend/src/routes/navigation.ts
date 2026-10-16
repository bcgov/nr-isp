export type NavigationItem = {
  path: string
  label: string
}

export type NavigationSection = {
  /** Omitted for links shown at the top level of the side navigation. */
  label?: string
  items: NavigationItem[]
}

/**
 * The side navigation from the CGI rebuild (bcgov-c/nr-isp). Paths and labels are kept so each page
 * is ported behind its existing path; confirm them against the original ISP during parity review.
 */
export const NAVIGATION: NavigationSection[] = [
  {
    items: [
      { path: '/isp-search', label: 'Search' },
      { path: '/isp-inbox', label: 'Inbox' },
      { path: '/sales-summary', label: 'Sales summary' },
    ],
  },
  {
    label: 'Table Maintenance',
    items: [
      { path: '/mills', label: 'Mill names' },
      { path: '/unit-of-measure', label: 'Unit of measure' },
      { path: '/volume-conversion', label: 'Volume conversion' },
      { path: '/isp-lumber-species', label: 'ISP species' },
      { path: '/lumber-grades', label: 'Lumber grade' },
      { path: '/chip-destinations', label: 'Chip destination' },
      { path: '/cls-lumber-range-check', label: 'Lumber - CLS' },
      { path: '/non-cls-lumber-range-check', label: 'Lumber - Non CLS' },
      { path: '/chip-range-check', label: 'Chip Range Check' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { path: '/r10-report', label: 'R10 - Mill table audit' },
      { path: '/r11-report', label: 'R11 - Lumber/chip summary' },
      { path: '/r12-report', label: 'R12 - Sales summary audit' },
      { path: '/r13-report', label: 'R13 - Ad hoc' },
    ],
  },
]

export const NAVIGATION_ITEMS: NavigationItem[] = NAVIGATION.flatMap((section) => section.items)

/** Whether a signed-out visitor's path names an ISP page worth returning to after sign-in. */
export const isKnownAppPath = (pathname: string): boolean =>
  NAVIGATION_ITEMS.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
