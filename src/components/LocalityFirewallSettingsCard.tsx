import { LockKey } from '@phosphor-icons/react'
import { Glyph } from './glyphs/Glyph'
import type { VaultEntry } from '../types'
import { summarizeVaultLocality } from '../lib/localityPolicy'
import { Badge } from './ui/badge'

interface LocalityFirewallSettingsCardProps {
  entries: VaultEntry[]
}

/** Shows the vault-level egress policy before agents, exports, or sync run. */
export function LocalityFirewallSettingsCard({ entries }: LocalityFirewallSettingsCardProps) {
  const summary = summarizeVaultLocality(entries)
  const hasEntries = summary.total > 0

  return (
    <div className="settings-material-card rounded-md border p-3" data-testid="locality-firewall-card">
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 text-muted-foreground"><Glyph name="shield" size={15} /></span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">Locality Firewall</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            What can leave this vault is visible before agents, exports, or sync run.
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <FirewallStat label="Protected local-only" value={hasEntries ? summary.localOnly : 'Scan vault'} />
        <FirewallStat label="Allowed by default" value={hasEntries ? summary.vaultContext : 'Not loaded'} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="rounded-md text-[10px]">frontmatter {summary.frontmatter}</Badge>
        <Badge variant="outline" className="rounded-md text-[10px]">type {summary.type}</Badge>
        <Badge variant="outline" className="rounded-md text-[10px]">path {summary.path}</Badge>
      </div>

      {summary.protectedTypes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {summary.protectedTypes.map((item) => (
            <Badge key={item.type} variant="secondary" className="rounded-md text-[10px]">
              {item.type} {item.count}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-2 grid gap-1" data-testid="locality-firewall-rules">
        <FirewallRule label="Agents" value="only vault-context notes; protected titles, paths, and bodies stay withheld" />
        <FirewallRule label="Export and sync" value="local-only notes and protected-only attachments are excluded by default" />
        <FirewallRule label="Override" value="explicit per-action review only; no silent cloud or remote egress" />
      </div>

      {summary.examples.length > 0 ? (
        <div className="mt-2 grid gap-1">
          {summary.examples.map((example) => (
            <div key={`${example.label}:${example.reason}`} className="flex gap-1.5 text-[11px] text-muted-foreground">
              <LockKey className="mt-0.5 size-3 shrink-0" />
              <span className="min-w-0">
                <span className="font-medium text-foreground">{example.label}</span>
                <span> · {example.reason}</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FirewallStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="settings-material-inner rounded-md border px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function FirewallRule({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-material-inner rounded-md border px-2 py-1.5 text-[11px] leading-snug">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground"> · {value}</span>
    </div>
  )
}
