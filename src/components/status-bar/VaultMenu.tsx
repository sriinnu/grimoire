import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { AlertTriangle, Check, FolderOpen, GitBranch, Loader2, Plus, Rocket, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  STATUS_BAR_POPOVER_BACKGROUND,
  STATUS_BAR_POPOVER_FOREGROUND,
  STATUS_BAR_POPOVER_MUTED_FOREGROUND,
} from './styles'
import { StatusBarHint } from './StatusBarHint'
import type { VaultOption } from './types'
import { useDismissibleLayer } from './useDismissibleLayer'

interface VaultMenuProps {
  vaults: VaultOption[]
  vaultPath: string
  openingVault?: VaultOpeningState | null
  onSwitchVault: (path: string) => void
  onOpenLocalFolder?: () => void
  onCreateEmptyVault?: () => void
  onCloneVault?: () => void
  onCloneGettingStarted?: () => void
  onRemoveVault?: (path: string) => void
  compact?: boolean
}

export interface VaultOpeningState {
  label: string
  path: string
}

interface VaultMenuItemProps {
  vault: VaultOption
  isActive: boolean
  canRemove: boolean
  onSelect: () => void
  onRemove?: () => void
}

interface VaultMenuActionProps {
  icon: ReactNode
  label: string
  testId: string
  accent?: boolean
  onClick: () => void
}

interface VaultAction {
  key: string
  icon: ReactNode
  label: string
  testId: string
  accent?: boolean
  onClick: () => void
}

function getVaultTriggerClassName(open: boolean, compact: boolean, opening: boolean) {
  if (opening) {
    return compact
      ? 'h-6 w-6 rounded-sm bg-[var(--hover)] p-0 text-foreground opacity-80'
      : 'h-auto gap-1 rounded-sm bg-[var(--hover)] px-1 py-0.5 text-[11px] font-medium text-foreground opacity-80'
  }

  if (compact) {
    return open
      ? 'h-6 w-6 rounded-sm bg-[var(--hover)] p-0 text-foreground hover:bg-[var(--hover)]'
      : 'h-6 w-6 rounded-sm p-0 text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'
  }

  return open
    ? 'h-auto gap-1 rounded-sm bg-[var(--hover)] px-1 py-0.5 text-[11px] font-medium text-foreground hover:bg-[var(--hover)]'
    : 'h-auto gap-1 rounded-sm px-1 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'
}

function getVaultOpeningLabel(openingVault: VaultOpeningState | null | undefined) {
  if (!openingVault) return null
  return openingVault.path ? `Opening ${openingVault.label}` : openingVault.label
}

function getVaultTriggerAriaLabel(openingVault: VaultOpeningState | null | undefined) {
  if (!openingVault) return 'Switch vault'
  return openingVault.path ? `Opening vault: ${openingVault.label}` : openingVault.label
}

function buildVaultActions({
  onCreateEmptyVault,
  onCloneGettingStarted,
  onCloneVault,
  onOpenLocalFolder,
}: Pick<VaultMenuProps, 'onCreateEmptyVault' | 'onCloneGettingStarted' | 'onCloneVault' | 'onOpenLocalFolder'>): VaultAction[] {
  const items: VaultAction[] = []

  if (onCreateEmptyVault) {
    items.push({
      key: 'create-empty',
      icon: <Plus size={12} />,
      label: 'Create empty vault',
      testId: 'vault-menu-create-empty',
      accent: true,
      onClick: onCreateEmptyVault,
    })
  }

  if (onOpenLocalFolder) {
    items.push({
      key: 'open-local',
      icon: <FolderOpen size={12} />,
      label: 'Open local folder',
      testId: 'vault-menu-open-local',
      onClick: onOpenLocalFolder,
    })
  }

  if (onCloneVault) {
    items.push({
      key: 'clone-git',
      icon: <GitBranch size={12} />,
      label: 'Clone Git repo',
      testId: 'vault-menu-clone-git',
      onClick: onCloneVault,
    })
  }

  if (onCloneGettingStarted) {
    items.push({
      key: 'clone-getting-started',
      icon: <Rocket size={12} />,
      label: 'Clone Getting Started Vault',
      testId: 'vault-menu-clone-getting-started',
      accent: true,
      onClick: onCloneGettingStarted,
    })
  }

  return items
}

function VaultMenuIcon({ isActive, unavailable }: { isActive: boolean; unavailable: boolean }) {
  if (isActive) return <Check size={12} />
  if (unavailable) return <AlertTriangle size={12} style={{ color: STATUS_BAR_POPOVER_MUTED_FOREGROUND }} />
  return <span style={{ width: 12 }} />
}

function VaultMenuItem({ vault, isActive, canRemove, onSelect, onRemove }: VaultMenuItemProps) {
  const unavailable = vault.available === false
  const removeLabel = `Remove ${vault.label} from list`
  const itemClassName = [
    'w-full justify-start rounded-sm px-2 py-1 text-xs font-normal',
    canRemove ? 'pr-7' : '',
    isActive
      ? 'text-foreground hover:bg-[var(--hover)] hover:text-foreground'
      : 'text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground',
  ].filter(Boolean).join(' ')

  return (
    <div className="group relative flex w-full items-center rounded-sm">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={unavailable}
        onClick={onSelect}
        aria-current={isActive ? 'true' : undefined}
        title={unavailable ? `Vault not found: ${vault.path}` : vault.path}
        data-testid={`vault-menu-item-${vault.label}`}
        className={itemClassName}
        style={{
          height: 'auto',
          background: isActive ? 'var(--hover)' : 'transparent',
          opacity: unavailable ? 0.45 : 1,
        }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <VaultMenuIcon isActive={isActive} unavailable={unavailable} />
          <span className="truncate">{vault.label}</span>
        </span>
      </Button>
      {canRemove && onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          title={removeLabel}
          aria-label={removeLabel}
          data-testid={`vault-menu-remove-${vault.label}`}
          className="absolute top-1/2 right-1 -translate-y-1/2 rounded-sm text-muted-foreground opacity-0 pointer-events-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:pointer-events-auto group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
        >
          <X size={10} />
        </Button>
      )}
    </div>
  )
}

function VaultMenuAction({ icon, label, testId, accent = false, onClick }: VaultMenuActionProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      className="h-auto w-full justify-start rounded-sm px-2 py-1 text-xs font-normal"
      style={{ color: accent ? 'var(--status-bar-accent-fg, var(--accent-blue))' : STATUS_BAR_POPOVER_MUTED_FOREGROUND }}
      data-testid={testId}
    >
      {icon}
      {label}
    </Button>
  )
}

function runAfterVaultMenuCloses(action: () => void, closeMenu: () => void) {
  flushSync(closeMenu)

  window.setTimeout(() => {
    action()
  }, 0)
}

export function VaultMenu({
  vaults,
  vaultPath,
  openingVault = null,
  onSwitchVault,
  onOpenLocalFolder,
  onCreateEmptyVault,
  onCloneVault,
  onCloneGettingStarted,
  onRemoveVault,
  compact = false,
}: VaultMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const activeVault = vaults.find((vault) => vault.path === vaultPath)
  const canRemove = !!onRemoveVault && vaults.length > 1
  const openingLabel = getVaultOpeningLabel(openingVault)
  const triggerClassName = getVaultTriggerClassName(open, compact, Boolean(openingVault))
  const triggerSize = compact ? 'icon-xs' : 'xs'
  const activeVaultLabel = activeVault?.label ?? 'Vault'

  useDismissibleLayer(open, menuRef, () => setOpen(false))

  const actions = useMemo<VaultAction[]>(() => {
    return buildVaultActions({
      onCreateEmptyVault,
      onCloneGettingStarted,
      onCloneVault,
      onOpenLocalFolder,
    })
  }, [onCreateEmptyVault, onCloneGettingStarted, onCloneVault, onOpenLocalFolder])

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <StatusBarHint copy={{ label: getVaultTriggerAriaLabel(openingVault) }}>
        <Button
          type="button"
          variant="ghost"
          size={triggerSize}
          className={triggerClassName}
          disabled={Boolean(openingVault)}
          onClick={() => setOpen((value) => !value)}
          aria-busy={openingVault ? true : undefined}
          aria-label={getVaultTriggerAriaLabel(openingVault)}
          data-testid="status-vault-trigger"
        >
          {openingVault ? <Loader2 className="animate-spin" size={13} /> : <FolderOpen size={13} />}
          {compact ? null : <span className="max-w-32 truncate">{openingLabel ?? activeVaultLabel}</span>}
        </Button>
      </StatusBarHint>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 4,
            background: STATUS_BAR_POPOVER_BACKGROUND,
            border: '1px solid var(--status-bar-control-border, var(--border))',
            borderRadius: 6,
            padding: 4,
            minWidth: 200,
            boxShadow: '0 4px 12px var(--shadow-dialog)',
            color: STATUS_BAR_POPOVER_FOREGROUND,
            zIndex: 1000,
          }}
        >
          {vaults.map((vault) => (
            <VaultMenuItem
              key={vault.path}
              vault={vault}
              isActive={vault.path === vaultPath}
              canRemove={canRemove}
              onSelect={() => {
                if (vault.path === vaultPath) {
                  setOpen(false)
                  return
                }

                runAfterVaultMenuCloses(() => onSwitchVault(vault.path), () => setOpen(false))
              }}
              onRemove={onRemoveVault ? () => {
                runAfterVaultMenuCloses(() => onRemoveVault(vault.path), () => setOpen(false))
              } : undefined}
            />
          ))}
          {actions.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />}
          {actions.map((action) => (
            <VaultMenuAction
              key={action.key}
              icon={action.icon}
              label={action.label}
              testId={action.testId}
              accent={action.accent}
              onClick={() => {
                runAfterVaultMenuCloses(action.onClick, () => setOpen(false))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
