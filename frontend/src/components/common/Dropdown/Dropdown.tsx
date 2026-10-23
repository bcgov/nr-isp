import React, { useEffect } from 'react'
import { Dropdown as CarbonDropdown } from '@carbon/react'
import { useMenuWidth } from '@/hooks/useMenuWidth'

interface DropdownProps<T> {
  id: string
  titleText?: React.ReactNode
  label?: string
  items: T[]
  itemToString: (item: T | null) => string
  selectedItem?: T | null
  onChange: (event: { selectedItem: T | null }) => void
  invalidText?: string
  invalid?: boolean
  disabled?: boolean
  direction?: 'top' | 'bottom'
  autoAlign?: boolean
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
  warn?: boolean
  warnText?: string
  /**
   * When true, marks this dropdown so an ancestor flex container can grow it on
   * focus (e.g. `.some-row:has(.dropdown--expand-on-focus):focus-within { flex-grow: ... }`).
   * Lets layouts opt individual dropdowns into focus-expand without each call site
   * needing to know/apply the marker class itself.
   */
  expandOnFocus?: boolean
}

function Dropdown<T>({
  id,
  titleText,
  label = 'Select...',
  items,
  itemToString,
  selectedItem,
  onChange,
  invalidText,
  invalid,
  disabled = false,
  direction = 'bottom',
  autoAlign,
  size,
  style,
  warn,
  warnText,
  expandOnFocus = false,
}: DropdownProps<T>) {
  const wrapperId = `dropdown-wrapper-${id}`
  const wrapperRef = useMenuWidth()
  const isInvalid = invalid !== undefined ? invalid : !!invalidText

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    // When autoAlign is on, Carbon uses floating-ui to position the open menu
    // via a transform. Clearing that transform below would clobber floating-ui's
    // positioning (snapping the menu to the top-left), so let floating-ui handle
    // overflow itself and skip the manual correction entirely.
    if (autoAlign) return

    const VIEWPORT_PADDING = 24

    const adjustMenuPosition = () => {
      const menu = wrapper.querySelector('.cds--list-box__menu') as HTMLElement | null
      if (!menu) return
      menu.style.transform = ''
      const rect = menu.getBoundingClientRect()
      const overflow = rect.right - (window.innerWidth - VIEWPORT_PADDING)
      if (overflow > 0) {
        menu.style.transform = `translateX(-${overflow}px)`
      }
    }

    const observer = new MutationObserver(adjustMenuPosition)
    observer.observe(wrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded'],
    })
    window.addEventListener('resize', adjustMenuPosition)
    window.addEventListener('scroll', adjustMenuPosition, true)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', adjustMenuPosition)
      window.removeEventListener('scroll', adjustMenuPosition, true)
    }
  }, [autoAlign, wrapperRef])

  return (
    <div style={style}>
      <style>{`
                #${wrapperId} .cds--list-box__menu {
                    width: max-content;
                    min-width: var(--trigger-width, 0px);
                }
            `}</style>
      <div
        id={wrapperId}
        ref={wrapperRef}
        className={expandOnFocus ? 'dropdown--expand-on-focus' : undefined}
      >
        <CarbonDropdown
          id={id}
          titleText={titleText}
          label={label}
          items={items}
          itemToString={itemToString}
          selectedItem={selectedItem ?? null}
          onChange={onChange}
          invalid={isInvalid}
          invalidText={invalidText}
          disabled={disabled}
          direction={direction}
          autoAlign={autoAlign}
          size={size}
          warn={warn}
          warnText={warnText}
        />
      </div>
    </div>
  )
}

export default Dropdown
