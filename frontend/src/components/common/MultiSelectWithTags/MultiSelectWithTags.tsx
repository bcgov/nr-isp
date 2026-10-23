import React from 'react'
import { Button, DismissibleTag, FilterableMultiSelect } from '@carbon/react'
import { useMenuWidth } from '@/hooks/useMenuWidth'
import './MultiSelectWithTags.scss'

interface SelectableItem {
  id: string
  name: string
}

interface MultiSelectWithTagsProps {
  /** Unique id passed to the underlying MultiSelect */
  id: string
  /** Bold label rendered above the MultiSelect */
  titleText: string
  /** Full list of items available for selection */
  items: SelectableItem[]
  /** Currently selected item ids */
  selectedIds: string[]
  /** Called whenever the selection changes */
  onChange: (selectedIds: string[]) => void
  /** Validation error message – renders the MultiSelect in an invalid state */
  invalidText?: string
  /** Placeholder text shown when nothing is selected in the dropdown */
  dropdownLabel?: string
  /**
   * When true (default), renders a "Clear" button below the tag list that
   * deselects all items.
   */
  showClearButton?: boolean
  /** Label for the clear button. Defaults to "Clear". */
  clearButtonLabel?: string
  /** Visual kind for the clear button. Defaults to "secondary". */
  clearButtonKind?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'ghost'
    | 'danger'
    | 'danger--ghost'
    | 'danger--tertiary'
  /** Size for the clear button. Defaults to "sm". */
  clearButtonSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Width override for the clear button. Defaults to "160px". */
  clearButtonWidth?: string
  /** Height of the scrollable tag container. Defaults to "8rem". */
  tagContainerHeight?: string
  /** When true, disables the MultiSelect and the Clear button. */
  disabled?: boolean
}

const SELECT_ALL_ID = '__select_all__'
const SELECT_ALL_ITEM: SelectableItem = { id: SELECT_ALL_ID, name: 'Select All' }

const MultiSelectWithTags: React.FC<MultiSelectWithTagsProps> = ({
  id,
  titleText,
  items,
  selectedIds,
  onChange,
  invalidText,
  dropdownLabel = 'Select...',
  showClearButton = true,
  clearButtonLabel = 'Clear',
  clearButtonKind = 'secondary',
  clearButtonSize = 'sm',
  clearButtonWidth = '160px',
  tagContainerHeight = '8rem',
  disabled = false,
}) => {
  const wrapperRef = useMenuWidth()

  const allRealIds = items.map((i) => i.id)
  const allSelected = allRealIds.length > 0 && allRealIds.every((rid) => selectedIds.includes(rid))

  const itemsWithSelectAll: SelectableItem[] = [SELECT_ALL_ITEM, ...items]

  const selectedItemsWithSelectAll = [
    ...(allSelected ? [SELECT_ALL_ITEM] : []),
    ...items.filter((item) => selectedIds.includes(item.id)),
  ]

  const handleMultiSelectChange = ({
    selectedItems: next,
  }: {
    selectedItems: SelectableItem[]
  }) => {
    const nextIds = (next || []).map((i) => i.id)
    const selectAllWasSelected = selectedItemsWithSelectAll.some((i) => i.id === SELECT_ALL_ID)
    const selectAllIsNowSelected = nextIds.includes(SELECT_ALL_ID)

    if (!selectAllWasSelected && selectAllIsNowSelected) {
      // "Select All" was just checked — select everything
      onChange(allRealIds)
    } else if (selectAllWasSelected && !selectAllIsNowSelected) {
      // "Select All" was just unchecked — clear everything
      onChange([])
    } else {
      // Regular item toggled — filter out the sentinel
      const realIds = nextIds.filter((rid) => rid !== SELECT_ALL_ID)
      onChange(realIds)
    }
  }

  const selectedItems = items.filter((item) => selectedIds.includes(item.id))

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((existingId) => existingId !== id))
  }

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onChange([])
  }

  const wrapperId = `multi-select-wrapper-${id}`

  return (
    <div>
      <style>{`
                #${wrapperId} .cds--list-box__menu {
                    width: max-content;
                    min-width: var(--trigger-width, 0px);
                }
            `}</style>
      <div
        id={wrapperId}
        ref={wrapperRef}
        onKeyDownCapture={(e) => {
          if (e.key === 'Backspace') {
            const input = (e.currentTarget as HTMLElement).querySelector('input')
            if (!input || input.value === '') {
              e.stopPropagation()
              e.preventDefault()
            }
          }
        }}
      >
        <FilterableMultiSelect
          id={id}
          titleText={<strong>{titleText}</strong>}
          items={itemsWithSelectAll}
          itemToString={(item) => (item ? item.name : '')}
          onChange={handleMultiSelectChange}
          initialSelectedItems={selectedItemsWithSelectAll}
          selectedItems={selectedItemsWithSelectAll}
          placeholder={dropdownLabel}
          invalid={!!invalidText}
          invalidText={invalidText}
          disabled={disabled}
          sortItems={(itemList) => [...itemList]}
          filterItems={(itemList, { itemToString, inputValue }) => {
            if (!inputValue) return [...itemList]
            return itemList.filter(
              (item) =>
                item.id === SELECT_ALL_ID ||
                itemToString(item).toLowerCase().includes(inputValue.toLowerCase()),
            )
          }}
        />
      </div>
      <div
        className="multiselect-tags-container"
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          border: '1px solid var(--cds-border-subtle)',
          borderRadius: 0,
          height: tagContainerHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}
      >
        {selectedItems.length === 0 ? (
          <p
            style={{
              color: 'var(--cds-text-placeholder)',
              textAlign: 'center',
              width: '100%',
              marginTop: '0.75rem',
            }}
          >
            Nothing Selected
          </p>
        ) : (
          selectedItems.map((item) => (
            <DismissibleTag
              key={item.id}
              type="gray"
              text={item.name}
              onClose={() => handleRemove(item.id)}
              style={{ maxWidth: '100%' }}
            />
          ))
        )}
      </div>
      {showClearButton && (
        <Button
          kind={clearButtonKind}
          size={clearButtonSize}
          style={{ marginTop: '0.5rem', width: clearButtonWidth }}
          onClick={handleClear}
          disabled={selectedIds.length === 0 || disabled}
          type="button"
        >
          {clearButtonLabel}
        </Button>
      )}
    </div>
  )
}

export default MultiSelectWithTags
