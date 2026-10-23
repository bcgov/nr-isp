import { DataTable, Search, type CarbonIconType } from '@carbon/icons-react'
import './TableEmptyState.scss'

export type TableStateType = 'initial' | 'no-results' | 'error'

// Icons rather than Carbon pictograms, which would need a second Carbon icon package.
const config: Record<TableStateType, { label: string; description: string; Icon: CarbonIconType }> =
  {
    initial: {
      label: 'No search performed',
      description: 'Use the filters above and click Search to see results.',
      Icon: Search,
    },
    error: {
      label: 'Something went wrong',
      description: 'An error occurred while loading data. Please try again.',
      Icon: DataTable,
    },
    'no-results': {
      label: 'No results found',
      description: 'Try adjusting your search criteria.',
      Icon: Search,
    },
  }

const TableEmptyState = ({ tableState }: { tableState: TableStateType }) => {
  const { label, description, Icon } = config[tableState]
  return (
    <div className="table-empty-state">
      <Icon aria-hidden="true" size={48} className="table-empty-state__icon" />
      <p className="table-empty-state__label">{label}</p>
      <p className="table-empty-state__description">{description}</p>
    </div>
  )
}

export default TableEmptyState
