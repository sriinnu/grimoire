import type { FrontmatterValue } from '../Inspector'
import { isValidCssColor } from '../../utils/colorUtils'
import { isUrlValue } from '../../utils/url'
import { canonicalSystemMetadataKey } from '../../utils/systemMetadata'
import type { PropertyDisplayMode } from '../../utils/propertyTypes'
import type { ScalarEditProps } from './propertyValueCellTypes'

const RELATIONSHIP_PROPERTY_KEYS = new Set(['belongs_to', 'related_to', 'has'])

function normalizePropertyKey(propKey: string): string {
  return propKey.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

export function showsRelationshipPropertyIcon(propKey: string): boolean {
  return RELATIONSHIP_PROPERTY_KEYS.has(normalizePropertyKey(propKey))
}

export function toBooleanValue(value: FrontmatterValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  return false
}

export function autoDetectFromValue(propKey: string, value: FrontmatterValue): PropertyDisplayMode {
  if (canonicalSystemMetadataKey(propKey) === '_icon') return 'text'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string' && isUrlValue(value)) return 'url'
  if (typeof value === 'string' && isValidCssColor(value) && value.startsWith('#')) return 'color'
  return 'text'
}

export function createScalarEditProps({
  propKey,
  value,
  isEditing,
  onStartEdit,
  onSave,
}: {
  propKey: string
  value: FrontmatterValue
  isEditing: boolean
  onStartEdit: (key: string | null) => void
  onSave: (key: string, value: string) => void
}): ScalarEditProps {
  return {
    value: String(value ?? ''),
    isEditing,
    onStartEdit: () => onStartEdit(propKey),
    onSave: (nextValue: string) => onSave(propKey, nextValue),
    onCancel: () => onStartEdit(null),
  }
}
