import { Cloud } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import { Button } from './ui/button'

export type ObjectStorageProvider = 's3' | 'azure'

export interface ObjectStoragePrototypeButton {
  label: string
  busyLabel: string
  actionId: VaultPortabilityActionId
  icon: ReactNode
  onClick?: () => void
  enabled?: boolean
  requiresVault?: boolean
}

export function ProviderToggle({
  provider,
  active,
  label,
  detail,
  onSelect,
}: {
  provider: ObjectStorageProvider
  active: boolean
  label: string
  detail: string
  onSelect: (provider: ObjectStorageProvider) => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      role="tab"
      aria-selected={active}
      data-testid={`settings-object-storage-provider-${provider}`}
      className="h-auto min-w-0 justify-start gap-2 whitespace-normal rounded-md p-2 text-left"
      onClick={() => onSelect(provider)}
    >
      <Cloud size={14} />
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        <span className="block text-[11px] leading-snug opacity-75">{detail}</span>
      </span>
    </Button>
  )
}

export function ProviderPanel({ provider, children }: { provider: ObjectStorageProvider; children: ReactNode }) {
  return (
    <div className="mt-2 grid gap-2" data-testid={`object-storage-provider-panel-${provider}`}>
      {children}
    </div>
  )
}

export function PrototypeButtons({
  buttons,
  busyAction,
  vaultReady,
}: {
  buttons: ObjectStoragePrototypeButton[]
  busyAction: VaultPortabilityActionId | null
  vaultReady: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((button) => (
        <Button
          key={button.actionId}
          type="button"
          variant="outline"
          size="sm"
          data-testid={`settings-${button.actionId}`}
          disabled={Boolean(busyAction) || (button.requiresVault !== false && !vaultReady) || !button.onClick || button.enabled === false}
          onClick={button.onClick}
        >
          {button.icon}
          {busyAction === button.actionId ? button.busyLabel : button.label}
        </Button>
      ))}
    </div>
  )
}

export function StorageActionGroup({
  title,
  description,
  children,
}: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grimoire-object-storage-preview grid gap-2 rounded-md border border-border p-2">
      <div>
        <div className="text-xs font-semibold text-foreground">{title}</div>
        <div className="text-[11px] leading-snug text-muted-foreground">{description}</div>
      </div>
      {children}
    </div>
  )
}
