import type { ComponentType } from 'react'
import type { IconProps } from './iconRegistry'
import { isEmoji } from './emojiRuntime'
import { findIcon } from './iconRegistry'

export type ResolvedNoteIcon =
  | { kind: 'none' }
  | { kind: 'emoji'; value: string }
  | { kind: 'image'; src: string }
  | { kind: 'phosphor'; Icon: ComponentType<IconProps> }

function isImageUrl(value: string): boolean {
  if (value.startsWith('data:image/')) return true
  if (value.startsWith('asset://localhost/') || value.startsWith('http://asset.localhost/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function hasNoteIconValue(icon: string | null | undefined): icon is string {
  return typeof icon === 'string' && icon.trim().length > 0
}

export function resolveNoteIcon(icon: string | null | undefined): ResolvedNoteIcon {
  if (!hasNoteIconValue(icon)) return { kind: 'none' }

  const trimmed = icon.trim()
  if (isEmoji(trimmed)) return { kind: 'emoji', value: trimmed }
  if (isImageUrl(trimmed)) return { kind: 'image', src: trimmed }

  const Icon = findIcon(trimmed)
  if (Icon) return { kind: 'phosphor', Icon }

  return { kind: 'none' }
}
