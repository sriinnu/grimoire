import { CloudCheck, CloudWarning } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { createTranslator } from '../lib/i18n'
import {
  desktopStorageHealthStatusLabel,
  desktopStorageProviderLabel,
  formatDesktopStorageHealthToast,
  redactDesktopStorageHealthMessage,
  runDesktopStorageHealthCheck,
  type DesktopStorageHealthReport,
  type DesktopStorageProviderId,
} from '../utils/desktopStorageHealth'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>

interface DesktopStorageHealthPanelProps {
  vaultPath: string
  t: Translate
}

type DesktopStorageReportMap = Partial<Record<DesktopStorageProviderId, DesktopStorageHealthReport>>

const PROVIDERS: DesktopStorageProviderId[] = ['icloud-drive', 'google-drive-desktop']

/** Renders read-only iCloud/GDrive Desktop local-folder proof without cloud credentials. */
export function DesktopStorageHealthPanel({ vaultPath, t }: DesktopStorageHealthPanelProps) {
  const [busyProvider, setBusyProvider] = useState<DesktopStorageProviderId | null>(null)
  const [reports, setReports] = useState<DesktopStorageReportMap>({})
  const [message, setMessage] = useState<string | null>(null)
  const vaultReady = vaultPath.trim().length > 0

  useEffect(() => {
    setReports({})
    setMessage(null)
  }, [vaultPath])

  const runCheck = async (providerId: DesktopStorageProviderId) => {
    if (!vaultReady || busyProvider) return
    setBusyProvider(providerId)
    setMessage(null)
    try {
      const report = await runDesktopStorageHealthCheck(vaultPath, providerId)
      setReports((current) => ({ ...current, [providerId]: report }))
      setMessage(formatDesktopStorageHealthToast(report))
    } catch (error) {
      const detail = error instanceof Error ? redactDesktopStorageHealthMessage(error.message) : null
      setMessage(detail ? `${t('settings.portability.desktopHealthFailed')}: ${detail}` : t('settings.portability.desktopHealthFailed'))
    } finally {
      setBusyProvider(null)
    }
  }

  return (
    <div
      className="settings-desktop-storage-panel grimoire-portability-inline-panel mt-2 grid gap-2 rounded-md border border-border p-2.5"
      data-testid="settings-desktop-storage-health"
    >
      <div className="flex items-start gap-2">
        <CloudCheck size={15} className="mt-0.5 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">
            {t('settings.portability.desktopHealthTitle')}
          </span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            {t('settings.portability.desktopHealthDescription')}
          </span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PROVIDERS.map((providerId) => (
          <Button
            key={providerId}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-md text-xs"
            disabled={!vaultReady || Boolean(busyProvider)}
            onClick={() => void runCheck(providerId)}
            data-testid={`settings-check-${providerId}`}
          >
            {busyProvider === providerId ? t('settings.portability.checkingStorage') : buttonLabel(providerId, t)}
          </Button>
        ))}
      </div>

      {message ? (
        <div className="text-[11px] leading-snug text-muted-foreground" data-testid="settings-desktop-storage-message">
          {message}
        </div>
      ) : null}

      <div className="grid gap-1.5">
        {PROVIDERS.map((providerId) => (
          <DesktopStorageHealthReportRow
            key={providerId}
            providerId={providerId}
            report={reports[providerId]}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

function DesktopStorageHealthReportRow({
  providerId,
  report,
  t,
}: {
  providerId: DesktopStorageProviderId
  report?: DesktopStorageHealthReport
  t: Translate
}) {
  const status = report?.status ?? 'not_selected'
  const Icon = report?.configured ? CloudCheck : CloudWarning
  return (
    <div
      className="settings-desktop-storage-row rounded-md border border-border/70 px-2 py-1.5 text-[11px]"
      data-testid={`settings-desktop-storage-report-${providerId}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon size={14} className={report?.configured ? 'text-[var(--accent-green)]' : 'text-muted-foreground'} />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {desktopStorageProviderLabel(providerId)}
        </span>
        <Badge variant={report?.configured ? 'secondary' : 'outline'} className="rounded-md text-[10px]">
          {desktopStorageHealthStatusLabel(status)}
        </Badge>
      </div>
      <div className="mt-1 leading-snug text-muted-foreground">
        {report?.message ?? t('settings.portability.desktopHealthNotRun')}
      </div>
      {report ? (
        <div className="mt-1 flex flex-wrap gap-1">
          <ProofChip label={t('settings.portability.localPathChecked')} active={report.local_path_checked} />
          <ProofChip label={t('settings.portability.providerRootDetected')} active={report.provider_root_detected} />
          <ProofChip label={t('settings.portability.vaultFolderChecked')} active={report.vault_directory_checked} />
          <ProofChip label={t('settings.portability.vaultReadable')} active={report.readable} />
          <ProofChip label={t('settings.portability.credentialsNotStored')} active={!report.credentials_stored} />
        </div>
      ) : null}
      {report?.risk_notes.length ? (
        <div className="mt-1 grid gap-0.5 text-[10px] leading-snug text-muted-foreground">
          {report.risk_notes.slice(0, 2).map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProofChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="settings-proof-chip rounded-sm border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {active ? label : `No ${label.toLowerCase()}`}
    </span>
  )
}

function buttonLabel(providerId: DesktopStorageProviderId, t: Translate): string {
  return providerId === 'icloud-drive'
    ? t('settings.portability.checkICloudFolder')
    : t('settings.portability.checkGoogleDriveFolder')
}
