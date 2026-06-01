import { StackSimple, WarningCircle } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getTypeColor, getTypeLightColor } from '../utils/typeColors'
import { CreateTypeDialog } from './CreateTypeDialog'
import { getTypeIcon } from './note-item/typeIcon'
import { PROPERTY_CHIP_STYLE } from './propertyChipStyles'
import {
  PROPERTY_PANEL_LABEL_CLASS_NAME,
  PROPERTY_PANEL_LABEL_ICON_SLOT_CLASS_NAME,
  PROPERTY_PANEL_ROW_STYLE,
} from './propertyPanelLayout'

const MISSING_TYPE_TOOLTIP = 'Missing type'

type TypeVisualKeys = Record<string, string | null>

interface TypeSelectorItemProps {
  type: string
  typeColorKeys: TypeVisualKeys
  typeIconKeys: TypeVisualKeys
}

/** Render a type icon and label with user-defined visual overrides. */
export function TypeSelectorItem({ type, typeColorKeys, typeIconKeys }: TypeSelectorItemProps) {
  const Icon = getTypeIcon(type, typeIconKeys[type])
  const color = getTypeColor(type, typeColorKeys[type])
  return (
    <>
      <Icon width={14} height={14} style={{ color }} />
      {type}
    </>
  )
}

/** Render the compact selected-type value used by the property chip. */
export function TypeSelectorValue({
  isA,
  typeColorKeys,
  typeIconKeys,
}: {
  isA?: string | null
  typeColorKeys: TypeVisualKeys
  typeIconKeys: TypeVisualKeys
}) {
  if (!isA) return <span className="truncate text-muted-foreground">None</span>

  return (
    <span className="flex min-w-0 items-center gap-1">
      <TypeSelectorItem type={isA} typeColorKeys={typeColorKeys} typeIconKeys={typeIconKeys} />
    </span>
  )
}

/** Render the Type property label with its stable icon slot. */
export function TypeRowLabel() {
  return (
    <span className={PROPERTY_PANEL_LABEL_CLASS_NAME}>
      <span
        className={PROPERTY_PANEL_LABEL_ICON_SLOT_CLASS_NAME}
        data-testid="type-row-icon-slot"
      >
        <StackSimple size={14} className="shrink-0" data-testid="type-row-icon" />
      </span>
      <span className="min-w-0 truncate">Type</span>
    </span>
  )
}

function MissingTypeWarning({
  missingTypeName,
  onCreateMissingType,
}: {
  missingTypeName: string
  onCreateMissingType?: (typeName: string) => boolean | void | Promise<boolean | void>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const canCreateMissingType = Boolean(onCreateMissingType)

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn(
              'h-6 w-6 shrink-0 rounded-md border border-[var(--feedback-warning-border)] bg-[var(--feedback-warning-bg)] p-0 text-[var(--feedback-warning-text)] shadow-none hover:brightness-95',
              !canCreateMissingType && 'cursor-default',
            )}
            data-testid="missing-type-warning"
            aria-label={`Missing type ${missingTypeName}. Click to create this type.`}
            onClick={canCreateMissingType ? () => setDialogOpen(true) : undefined}
          >
            <WarningCircle size={14} weight="fill" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{MISSING_TYPE_TOOLTIP}</TooltipContent>
      </Tooltip>
      {canCreateMissingType && (
        <CreateTypeDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreate={(typeName) => onCreateMissingType?.(typeName)}
          initialName={missingTypeName}
        />
      )}
    </>
  )
}

/** Render the value column and optional missing-type affordance. */
export function TypeRowValue({
  children,
  missingTypeName,
  onCreateMissingType,
}: {
  children: ReactNode
  missingTypeName?: string | null
  onCreateMissingType?: (typeName: string) => boolean | void | Promise<boolean | void>
}) {
  return (
    <div className="flex min-w-0 items-center justify-start gap-1">
      <div className="min-w-0">{children}</div>
      {missingTypeName && (
        <MissingTypeWarning
          missingTypeName={missingTypeName}
          onCreateMissingType={onCreateMissingType}
        />
      )}
    </div>
  )
}

/** Render a non-editable Type row for read-only inspector contexts. */
export function ReadOnlyType({
  isA,
  customColorKey,
  onNavigate,
  missingTypeName,
  onCreateMissingType,
}: {
  isA?: string | null
  customColorKey?: string | null
  onNavigate?: (target: string) => void
  missingTypeName?: string | null
  onCreateMissingType?: (typeName: string) => boolean | void | Promise<boolean | void>
}) {
  if (!isA) return null
  return (
    <div
      className="grid min-h-7 min-w-0 grid-cols-2 items-center gap-2 px-1.5"
      style={PROPERTY_PANEL_ROW_STYLE}
    >
      <TypeRowLabel />
      <TypeRowValue missingTypeName={missingTypeName} onCreateMissingType={onCreateMissingType}>
        {onNavigate ? (
          <button
            className="min-w-0 max-w-full truncate border-none cursor-pointer ring-inset hover:ring-1 hover:ring-current"
            style={{
              ...PROPERTY_CHIP_STYLE,
              background: getTypeLightColor(isA, customColorKey),
              color: getTypeColor(isA, customColorKey),
              display: 'inline-flex',
              alignItems: 'center',
            }}
            onClick={() => onNavigate(isA.toLowerCase())}
            title={isA}
          >
            {isA}
          </button>
        ) : (
          <span className="text-[12px] text-secondary-foreground">{isA}</span>
        )}
      </TypeRowValue>
    </div>
  )
}
