import React from 'react'
import { Button } from '@carbon/react'
import { Search } from '@carbon/icons-react'

interface SearchButtonsProps {
  isLoading?: boolean
  searchLabel?: string
  style?: React.CSSProperties
}

const SearchButton: React.FC<SearchButtonsProps> = ({
  isLoading = false,
  searchLabel = 'Search',
  style,
}) => {
  return (
    <Button type="submit" size="md" style={style} disabled={isLoading} renderIcon={Search}>
      {searchLabel}
    </Button>
  )
}

export default SearchButton
