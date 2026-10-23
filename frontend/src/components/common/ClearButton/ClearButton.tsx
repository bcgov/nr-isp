import React from 'react'
import { Button } from '@carbon/react'

interface ClearButtonProps {
  onClick: () => void
  isLoading?: boolean
  label?: string
  style?: React.CSSProperties
  kind?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'ghost'
    | 'danger'
    | 'danger--ghost'
    | 'danger--tertiary'
}

const ClearButton: React.FC<ClearButtonProps> = ({
  onClick,
  isLoading = false,
  label = 'Clear',
  style,
  kind = 'secondary',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onClick()
  }

  return (
    <Button
      kind={kind}
      size="md"
      onClick={handleClick}
      type="button"
      disabled={isLoading}
      style={style}
    >
      {label}
    </Button>
  )
}

export default ClearButton
