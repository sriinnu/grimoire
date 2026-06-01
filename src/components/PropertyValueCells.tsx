import type { ReactNode } from 'react'
import type { PropertyDisplayMode } from '../utils/propertyTypes'
import { canonicalSystemMetadataKey } from '../utils/systemMetadata'
import { ColorEditableValue } from './ColorInput'
import { EditableValue, TagPillList, UrlValue } from './EditableValue'
import { IconEditableValue } from './IconEditableValue'
import {
  BooleanToggle,
  DateValue,
  NumberValue,
  StatusValue,
  TagsValue,
} from './property-value-cells/PropertyPrimitiveValues'
import { DisplayModeSelector } from './property-value-cells/PropertyDisplayModeSelector'
import {
  autoDetectFromValue,
  createScalarEditProps,
  toBooleanValue,
} from './property-value-cells/propertyValueCellModel'
import type {
  ScalarEditProps,
  SmartCellProps,
} from './property-value-cells/propertyValueCellTypes'

export { DisplayModeSelector }

type ScalarRendererProps = SmartCellProps & {
  editProps: ScalarEditProps
}

const SCALAR_DISPLAY_RENDERERS: Partial<Record<PropertyDisplayMode, (props: ScalarRendererProps) => ReactNode>> = {
  status: ({ propKey, value, isEditing, vaultStatuses, onSave, onStartEdit }) => (
    <StatusValue propKey={propKey} value={value ?? ''} isEditing={isEditing} vaultStatuses={vaultStatuses} onSave={onSave} onStartEdit={onStartEdit} />
  ),
  tags: ({ propKey, value, isEditing, vaultTags, onSaveList, onStartEdit }) => (
    <TagsValue propKey={propKey} value={value ? [String(value)] : []} isEditing={isEditing} vaultTags={vaultTags} onSave={onSaveList} onStartEdit={onStartEdit} />
  ),
  date: ({ propKey, value, isEditing, onSave, onStartEdit }) => (
    <DateValue
      key={`${propKey}:${isEditing ? 'editing' : 'view'}`}
      value={String(value ?? '')}
      onSave={(nextValue) => onSave(propKey, nextValue)}
      autoOpen={isEditing}
      onCancel={() => onStartEdit(null)}
    />
  ),
  number: ({ editProps }) => <NumberValue {...editProps} />,
  boolean: ({ propKey, value, onUpdate }) => {
    const boolVal = toBooleanValue(value)
    return <BooleanToggle value={boolVal} onToggle={() => onUpdate?.(propKey, !boolVal)} />
  },
  url: ({ editProps }) => <UrlValue {...editProps} />,
  color: ({ editProps }) => <ColorEditableValue {...editProps} />,
}

function renderScalarDisplayMode(props: ScalarRendererProps & { resolvedMode: PropertyDisplayMode }) {
  const renderer = SCALAR_DISPLAY_RENDERERS[props.resolvedMode]
  return renderer ? renderer(props) : <EditableValue {...props.editProps} />
}

function ScalarValueCell(props: SmartCellProps) {
  const { propKey, value, displayMode, isEditing, onStartEdit, onSave } = props
  const editProps = createScalarEditProps({
    propKey,
    value,
    isEditing,
    onStartEdit,
    onSave,
  })

  if (canonicalSystemMetadataKey(propKey) === '_icon') {
    return <IconEditableValue {...editProps} />
  }

  const resolvedMode = displayMode === 'text' ? autoDetectFromValue(propKey, value) : displayMode
  return renderScalarDisplayMode({ ...props, resolvedMode, editProps })
}

export function SmartPropertyValueCell(props: SmartCellProps) {
  const { propKey, value, displayMode, isEditing, vaultTags, onSaveList, onStartEdit } = props
  if (Array.isArray(value)) {
    if (displayMode === 'tags') {
      return <TagsValue propKey={propKey} value={value.map(String)} isEditing={isEditing} vaultTags={vaultTags} onSave={onSaveList} onStartEdit={onStartEdit} />
    }
    return <TagPillList items={value.map(String)} onSave={(items) => onSaveList(propKey, items)} label={propKey} />
  }
  return <ScalarValueCell {...props} />
}
