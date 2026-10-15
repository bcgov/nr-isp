import React from 'react'
import { Button } from '@carbon/react'

interface ExportButtonsProps {
  onExport: (format: 'pdf' | 'csv') => void | Promise<void>
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ onExport, size = 'sm', style }) => {
  const handleClick = (format: 'pdf' | 'csv'): void => {
    void onExport(format)
  }

  return (
    <div style={style}>
      <Button
        kind="secondary"
        size={size}
        style={{ marginRight: '0.5rem' }}
        onClick={(): void => handleClick('pdf')}
      >
        Export to PDF
      </Button>
      <Button kind="secondary" size={size} onClick={(): void => handleClick('csv')}>
        Export to CSV
      </Button>
    </div>
  )
}

export default ExportButtons
