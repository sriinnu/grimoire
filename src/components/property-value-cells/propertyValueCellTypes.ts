import type { PropertyDisplayMode } from '../../utils/propertyTypes'
import type { FrontmatterValue } from '../Inspector'

export type SmartCellProps = {
  propKey: string
  value: FrontmatterValue
  displayMode: PropertyDisplayMode
  isEditing: boolean
  vaultStatuses: string[]
  vaultTags: string[]
  onStartEdit: (key: string | null) => void
  onSave: (key: string, value: string) => void
  onSaveList: (key: string, items: string[]) => void
  onUpdate?: (key: string, value: FrontmatterValue) => void
}

export interface ScalarEditProps {
  value: string
  isEditing: boolean
  onStartEdit: () => void
  onSave: (nextValue: string) => void
  onCancel: () => void
}
