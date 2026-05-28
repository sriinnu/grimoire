import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatShortcutDisplay } from '../hooks/appCommandCatalog'
import { Button } from '@/components/ui/button'
import { ActionTooltip, type ActionTooltipCopy } from '@/components/ui/action-tooltip'
import {
  GitBranch,
  Code,
  Sparkle,
  SlidersHorizontal,
  Trash,
  Archive,
  ArrowUUpLeft,
  Star,
  CheckCircle,
  TextAlignCenter,
  TextAlignLeft,
} from '@phosphor-icons/react'
import type { NoteLayout, VaultEntry } from '../types'
import { BREADCRUMB_ICON_CLASS, type BreadcrumbBarProps } from './breadcrumbBarTypes'

const DISABLED_ICON_STYLE = { opacity: 0.4, cursor: 'not-allowed' } as const

function IconActionButton({
  copy,
  onClick,
  className,
  style,
  children,
  testId,
  tooltipAlign,
}: {
  copy: ActionTooltipCopy
  onClick?: () => void
  className?: string
  style?: CSSProperties
  children: ReactNode
  testId?: string
  tooltipAlign?: 'start' | 'center' | 'end'
}) {
  return (
    <ActionTooltip copy={copy} side="bottom" align={tooltipAlign}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn('text-muted-foreground [&_svg:not([class*=size-])]:size-4', className)}
        style={style}
        onClick={onClick}
        aria-label={copy.label}
        aria-disabled={onClick ? undefined : true}
        data-testid={testId}
      >
        {children}
      </Button>
    </ActionTooltip>
  )
}

interface ToggleIconActionProps {
  active: boolean
  activeClassName: string
  activeLabel: string
  children: ReactNode
  inactiveClassName?: string
  inactiveLabel: string
  onClick?: () => void
  shortcut: string
}

function ToggleIconAction({
  active,
  activeClassName,
  activeLabel,
  children,
  inactiveClassName = 'hover:text-foreground',
  inactiveLabel,
  onClick,
  shortcut,
}: ToggleIconActionProps) {
  return (
    <IconActionButton
      copy={{ label: active ? activeLabel : inactiveLabel, shortcut }}
      onClick={onClick}
      className={cn(active ? activeClassName : inactiveClassName)}
    >
      {children}
    </IconActionButton>
  )
}

function RawToggleButton({
  rawMode,
  onToggleRaw,
}: {
  rawMode?: boolean
  onToggleRaw?: () => void
}) {
  return (
    <ToggleIconAction
      active={!!rawMode}
      activeClassName="text-foreground"
      activeLabel="Return to the editor"
      inactiveLabel="Open the raw editor"
      onClick={onToggleRaw}
      shortcut={formatShortcutDisplay({ display: '⌘\\' })}
    >
      <Code size={16} className={BREADCRUMB_ICON_CLASS} />
    </ToggleIconAction>
  )
}

function NoteLayoutAction({
  noteLayout = 'centered',
  onToggleNoteLayout,
}: {
  noteLayout?: NoteLayout
  onToggleNoteLayout?: () => void
}) {
  if (!onToggleNoteLayout) return null

  const isLeftAligned = noteLayout === 'left'
  return (
    <IconActionButton
      copy={{
        label: isLeftAligned
          ? 'Switch to centered note layout'
          : 'Switch to left-aligned note layout',
      }}
      onClick={onToggleNoteLayout}
      className={cn(isLeftAligned ? 'text-foreground' : 'hover:text-foreground')}
    >
      {isLeftAligned
        ? <TextAlignLeft size={16} className={BREADCRUMB_ICON_CLASS} />
        : <TextAlignCenter size={16} className={BREADCRUMB_ICON_CLASS} />}
    </IconActionButton>
  )
}

function FavoriteAction({
  favorite,
  onToggleFavorite,
}: {
  favorite: boolean
  onToggleFavorite?: () => void
}) {
  return (
    <ToggleIconAction
      active={favorite}
      activeClassName="text-[var(--accent-yellow)]"
      activeLabel="Remove from favorites"
      inactiveLabel="Add to favorites"
      onClick={onToggleFavorite}
      shortcut={formatShortcutDisplay({ display: '⌘D' })}
    >
      <Star
        size={16}
        weight={favorite ? 'fill' : 'regular'}
        className={BREADCRUMB_ICON_CLASS}
      />
    </ToggleIconAction>
  )
}

function OrganizedAction({
  organized,
  onToggleOrganized,
}: {
  organized: boolean
  onToggleOrganized?: () => void
}) {
  if (!onToggleOrganized) return null
  return (
    <ToggleIconAction
      active={organized}
      activeClassName="text-[var(--accent-green)]"
      activeLabel="Set note as not organized"
      inactiveLabel="Set note as organized"
      onClick={onToggleOrganized}
      shortcut={formatShortcutDisplay({ display: '⌘E' })}
    >
      <CheckCircle
        size={16}
        weight={organized ? 'fill' : 'regular'}
        className={BREADCRUMB_ICON_CLASS}
      />
    </ToggleIconAction>
  )
}

function DiffAction({
  showDiffToggle,
  diffMode,
  diffLoading,
  onToggleDiff,
}: Pick<BreadcrumbBarProps, 'showDiffToggle' | 'diffMode' | 'diffLoading' | 'onToggleDiff'>) {
  if (!showDiffToggle) {
    return (
      <IconActionButton copy={{ label: 'No diff is available yet' }} style={DISABLED_ICON_STYLE}>
        <GitBranch size={16} className={BREADCRUMB_ICON_CLASS} />
      </IconActionButton>
    )
  }

  const copy: ActionTooltipCopy = diffLoading
    ? { label: 'Loading the diff' }
    : { label: diffMode ? 'Return to the editor' : 'Show the current diff' }
  return (
    <IconActionButton
      copy={copy}
      onClick={onToggleDiff}
      className={cn(diffMode ? 'text-foreground' : 'hover:text-foreground')}
    >
      <GitBranch size={16} className={BREADCRUMB_ICON_CLASS} />
    </IconActionButton>
  )
}

function AIChatAction({
  showAIChat,
  onToggleAIChat,
}: Pick<BreadcrumbBarProps, 'showAIChat' | 'onToggleAIChat'>) {
  return (
    <ToggleIconAction
      active={!!showAIChat}
      activeClassName="text-primary"
      activeLabel="Close the AI panel"
      inactiveLabel="Open the AI panel"
      onClick={onToggleAIChat}
      shortcut={formatShortcutDisplay({ display: '⌘⇧L' })}
    >
      <Sparkle
        size={16}
        weight={showAIChat ? 'fill' : 'regular'}
        className={BREADCRUMB_ICON_CLASS}
      />
    </ToggleIconAction>
  )
}

function ArchiveAction({
  archived,
  onArchive,
  onUnarchive,
}: Pick<VaultEntry, 'archived'> & Pick<BreadcrumbBarProps, 'onArchive' | 'onUnarchive'>) {
  if (archived) {
    return (
      <IconActionButton
        copy={{ label: 'Restore this archived note' }}
        onClick={onUnarchive}
        className="hover:text-foreground"
      >
        <ArrowUUpLeft size={16} className={BREADCRUMB_ICON_CLASS} />
      </IconActionButton>
    )
  }

  return (
    <IconActionButton
      copy={{ label: 'Archive this note' }}
      onClick={onArchive}
      className="hover:text-foreground"
    >
      <Archive size={16} className={BREADCRUMB_ICON_CLASS} />
    </IconActionButton>
  )
}

function DeleteAction({ onDelete }: Pick<BreadcrumbBarProps, 'onDelete'>) {
  return (
    <IconActionButton
      copy={{
        label: 'Delete this note',
        shortcut: formatShortcutDisplay({ display: '⌘⌫ / ⌘⌦' }),
      }}
      onClick={onDelete}
      className="hover:text-destructive"
    >
      <Trash size={16} className={BREADCRUMB_ICON_CLASS} />
    </IconActionButton>
  )
}

function InspectorAction({
  inspectorCollapsed,
  onToggleInspector,
}: Pick<BreadcrumbBarProps, 'inspectorCollapsed' | 'onToggleInspector'>) {
  if (!inspectorCollapsed) return null
  return (
    <IconActionButton
      copy={{
        label: 'Open the properties panel',
        shortcut: formatShortcutDisplay({ display: '⌘⇧I' }),
      }}
      onClick={onToggleInspector}
      className="hover:text-foreground"
      tooltipAlign="end"
    >
      <SlidersHorizontal size={16} className={BREADCRUMB_ICON_CLASS} />
    </IconActionButton>
  )
}

/** Renders the right-aligned note action cluster in the breadcrumb bar. */
export function BreadcrumbActions({
  entry,
  showDiffToggle,
  diffMode,
  diffLoading,
  onToggleDiff,
  rawMode,
  onToggleRaw,
  forceRawMode,
  noteLayout,
  onToggleNoteLayout,
  showAIChat,
  onToggleAIChat,
  inspectorCollapsed,
  onToggleInspector,
  onToggleFavorite,
  onToggleOrganized,
  onDelete,
  onArchive,
  onUnarchive,
}: Omit<BreadcrumbBarProps, 'wordCount' | 'barRef' | 'onRenameFilename'>) {
  return (
    <div className="breadcrumb-bar__actions ml-auto flex items-center" style={{ gap: 12 }}>
      <FavoriteAction favorite={entry.favorite} onToggleFavorite={onToggleFavorite} />
      <OrganizedAction organized={entry.organized} onToggleOrganized={onToggleOrganized} />
      <DiffAction
        showDiffToggle={showDiffToggle}
        diffMode={diffMode}
        diffLoading={diffLoading}
        onToggleDiff={onToggleDiff}
      />
      {!forceRawMode && <RawToggleButton rawMode={rawMode} onToggleRaw={onToggleRaw} />}
      <NoteLayoutAction noteLayout={noteLayout} onToggleNoteLayout={onToggleNoteLayout} />
      <AIChatAction showAIChat={showAIChat} onToggleAIChat={onToggleAIChat} />
      <ArchiveAction archived={entry.archived} onArchive={onArchive} onUnarchive={onUnarchive} />
      <DeleteAction onDelete={onDelete} />
      <InspectorAction inspectorCollapsed={inspectorCollapsed} onToggleInspector={onToggleInspector} />
    </div>
  )
}
