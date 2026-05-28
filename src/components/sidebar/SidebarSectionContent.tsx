import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import type { IconProps } from '@phosphor-icons/react'
import type { SidebarSelection } from '../../types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { TypeIconMark } from '../TypeIconMark'
import { getTypeColor, getTypeLightColor } from '../../utils/typeColors'
import { SidebarCountPill } from './SidebarNavItem'
import { isSelectionActive } from './sidebarSelection'
import type { SectionGroup } from './sidebarSectionTypes'

export interface SectionContentProps {
  group: SectionGroup
  itemCount: number
  selection: SidebarSelection
  onSelect: (sel: SidebarSelection) => void
  onContextMenu: (e: MouseEvent, type: string) => void
  dragHandleProps?: Record<string, unknown>
  isRenaming?: boolean
  renameInitialValue?: string
  onRenameSubmit?: (value: string) => void
  onRenameCancel?: () => void
}

function resolveSectionColors(type: string, customColor?: string | null) {
  return {
    sectionColor: getTypeColor(type, customColor),
    sectionLightColor: getTypeLightColor(type, customColor),
  }
}

function InlineRenameInput({ initialValue, onSubmit, onCancel }: {
  initialValue: string
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onSubmit(value.trim()) }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() }
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSubmit(value.trim())}
      onClick={(e) => e.stopPropagation()}
      aria-label="Section name"
      className="h-auto flex-1 rounded border-primary bg-background px-1 py-px text-[13px] font-medium text-foreground shadow-none"
    />
  )
}

function getSectionHeaderBackground(isActive: boolean, sectionLightColor: string) {
  if (!isActive) return undefined
  return { background: sectionLightColor }
}

function getSectionHeaderIconWeight(isActive: boolean): IconProps['weight'] {
  return isActive ? 'fill' : 'regular'
}

function getSectionHeaderTitleColor(isActive: boolean, sectionColor: string) {
  if (!isActive) return undefined
  return sectionColor
}

function getSectionSelectHandler(isRenaming: boolean | undefined, onSelect: () => void) {
  if (isRenaming) return undefined
  return onSelect
}

function getSectionContextMenuHandler(
  isRenaming: boolean | undefined,
  onContextMenu: (e: MouseEvent) => void,
) {
  if (isRenaming) return undefined
  return onContextMenu
}

function resolveInlineRenameHandlers({
  isRenaming,
  onRenameCancel,
  onRenameSubmit,
}: {
  isRenaming?: boolean
  onRenameCancel?: () => void
  onRenameSubmit?: (value: string) => void
}): { onRenameCancel: () => void; onRenameSubmit: (value: string) => void } | null {
  if (!isRenaming || !onRenameSubmit || !onRenameCancel) return null
  return { onRenameCancel, onRenameSubmit }
}

function SectionHeaderLabel({
  type,
  label,
  isActive,
  sectionColor,
  isRenaming,
  renameInitialValue,
  onRenameSubmit,
  onRenameCancel,
}: {
  type: string
  label: string
  isActive: boolean
  sectionColor: string
  isRenaming?: boolean
  renameInitialValue?: string
  onRenameSubmit?: (value: string) => void
  onRenameCancel?: () => void
}) {
  const inlineRenameHandlers = resolveInlineRenameHandlers({
    isRenaming,
    onRenameCancel,
    onRenameSubmit,
  })

  if (inlineRenameHandlers) {
    return (
      <InlineRenameInput
        key={`rename-${type}`}
        initialValue={renameInitialValue ?? label}
        onSubmit={inlineRenameHandlers.onRenameSubmit}
        onCancel={inlineRenameHandlers.onRenameCancel}
      />
    )
  }

  return <span className="text-[13px] font-medium" style={{ marginLeft: 4, color: getSectionHeaderTitleColor(isActive, sectionColor) }}>{label}</span>
}

function SectionHeaderCountPill({
  itemCount,
  isActive,
  sectionColor,
}: {
  itemCount: number
  isActive: boolean
  sectionColor: string
}) {
  if (itemCount <= 0) return null
  return (
    <SidebarCountPill
      count={itemCount}
      className={!isActive ? 'text-muted-foreground' : undefined}
      style={isActive ? { background: sectionColor, color: 'var(--text-inverse)' } : { background: 'var(--muted)' }}
    />
  )
}

function SectionHeader({ label, type, Icon, iconValue, sectionColor, sectionLightColor, itemCount, isActive, onSelect, onContextMenu, dragHandleProps, isRenaming, renameInitialValue, onRenameSubmit, onRenameCancel }: {
  label: string; type: string; Icon: ComponentType<IconProps>; iconValue?: string | null
  sectionColor: string; sectionLightColor: string; itemCount: number; isActive: boolean
  onSelect: () => void; onContextMenu: (e: MouseEvent) => void
  dragHandleProps?: Record<string, unknown>
  isRenaming?: boolean; renameInitialValue?: string
  onRenameSubmit?: (value: string) => void; onRenameCancel?: () => void
}) {
  return (
    <div
      className={cn("group/section flex cursor-pointer select-none items-center justify-between rounded transition-colors", !isActive && "hover:bg-accent")}
      style={{ padding: '6px 8px 6px 16px', borderRadius: 4, gap: 4, ...getSectionHeaderBackground(isActive, sectionLightColor) }}
      {...dragHandleProps}
      onClick={getSectionSelectHandler(isRenaming, onSelect)}
      onContextMenu={getSectionContextMenuHandler(isRenaming, onContextMenu)}
    >
      <div className="flex min-w-0 flex-1 items-center" style={{ gap: 4 }}>
        <TypeIconMark
          className="shrink-0"
          color={sectionColor}
          fallbackIcon={(props) => <Icon {...props} weight={getSectionHeaderIconWeight(isActive)} />}
          iconValue={iconValue}
          size={16}
        />
        <SectionHeaderLabel
          type={type}
          label={label}
          isActive={isActive}
          sectionColor={sectionColor}
          isRenaming={isRenaming}
          renameInitialValue={renameInitialValue}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      </div>
      <SectionHeaderCountPill itemCount={itemCount} isActive={isActive} sectionColor={sectionColor} />
    </div>
  )
}

export function SectionContent({
  group, itemCount, selection, onSelect,
  onContextMenu, dragHandleProps,
  isRenaming, renameInitialValue, onRenameSubmit, onRenameCancel,
}: SectionContentProps) {
  const { label, type, Icon, customColor, iconValue } = group
  const { sectionColor, sectionLightColor } = resolveSectionColors(type, customColor)

  return (
    <SectionHeader
      label={label} type={type} Icon={Icon} iconValue={iconValue}
      sectionColor={sectionColor}
      sectionLightColor={sectionLightColor}
      itemCount={itemCount}
      isActive={isSelectionActive(selection, { kind: 'sectionGroup', type })}
      onSelect={() => onSelect({ kind: 'sectionGroup', type })}
      onContextMenu={(e) => onContextMenu(e, type)}
      dragHandleProps={dragHandleProps}
      isRenaming={isRenaming}
      renameInitialValue={renameInitialValue}
      onRenameSubmit={onRenameSubmit}
      onRenameCancel={onRenameCancel}
    />
  )
}
