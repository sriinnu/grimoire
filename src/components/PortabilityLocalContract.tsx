import { Database, LockKey } from '@phosphor-icons/react'
import { Glyph } from './glyphs/Glyph'
import type { ReactNode } from 'react'
import type { createTranslator } from '../lib/i18n'

type Translate = ReturnType<typeof createTranslator>

interface ContractItem {
  icon: ReactNode
  id: 'markdown' | 'private' | 'desktop' | 'provider'
  label: string
}

interface PortabilityLocalContractProps {
  t: Translate
}

/** Shows the local-first portability contract before any import/export/sync action can run. */
export function PortabilityLocalContract({ t }: PortabilityLocalContractProps) {
  const items: ContractItem[] = [
    {
      icon: <Glyph name="file" size={15} />,
      id: 'markdown',
      label: t('settings.portability.localContractMarkdown'),
    },
    {
      icon: <LockKey size={15} />,
      id: 'private',
      label: t('settings.portability.localContractPrivate'),
    },
    {
      icon: <Glyph name="cloudVault" size={15} />,
      id: 'desktop',
      label: t('settings.portability.localContractDesktop'),
    },
    {
      icon: <Database size={15} />,
      id: 'provider',
      label: t('settings.portability.localContractProvider'),
    },
  ]

  return (
    <div
      aria-label={t('settings.portability.localContractAria')}
      className="grimoire-portability-contract grimoire-portability-card rounded-md border border-border p-2.5"
      data-testid="portability-local-contract"
    >
      <div className="mb-2 text-xs font-semibold text-foreground">
        {t('settings.portability.localContractTitle')}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <div
            className="grimoire-portability-contract__item grimoire-preview-stat flex min-w-0 items-center gap-2 rounded-md border border-border px-2 py-1.5 text-[11px] leading-snug text-muted-foreground"
            data-contract-item={item.id}
            key={item.id}
          >
            <span className="shrink-0 text-muted-foreground">{item.icon}</span>
            <span className="min-w-0">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
