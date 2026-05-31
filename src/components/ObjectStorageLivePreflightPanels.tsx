import type { Dispatch, SetStateAction } from 'react'
import type { createTranslator } from '../lib/i18n'
import {
  type S3LivePreflightStatus,
  type S3LivePreflightReport,
} from '../utils/objectStorageSync'
import {
  type AzureLivePreflightStatus,
  type AzureLivePreflightReport,
} from '../utils/objectStorageLivePreflight'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import type { AzurePreflightDraft, S3PreflightDraft } from './ObjectStorageLivePreflightDrafts'

type Translate = ReturnType<typeof createTranslator>

export function S3LivePreflightControls({
  t,
  draft,
  onChange,
}: {
  t: Translate
  draft: S3PreflightDraft
  onChange: Dispatch<SetStateAction<S3PreflightDraft>>
}) {
  return (
    <LivePreflightControls
      note={t('settings.portability.s3PreflightLocalNote')}
      testId="s3-live-preflight-controls"
      fields={[
        field(t('settings.portability.s3BucketLabel'), draft.bucket, 'settings-s3-preflight-bucket', (bucket) => onChange(current => ({ ...current, bucket }))),
        field(t('settings.portability.s3RegionLabel'), draft.region, 'settings-s3-preflight-region', (region) => onChange(current => ({ ...current, region }))),
        field(t('settings.portability.s3PrefixLabel'), draft.prefix, 'settings-s3-preflight-prefix', (prefix) => onChange(current => ({ ...current, prefix }))),
      ]}
    />
  )
}

export function AzureLivePreflightControls({
  t,
  draft,
  onChange,
}: {
  t: Translate
  draft: AzurePreflightDraft
  onChange: Dispatch<SetStateAction<AzurePreflightDraft>>
}) {
  return (
    <LivePreflightControls
      note={t('settings.portability.azurePreflightLocalNote')}
      testId="azure-live-preflight-controls"
      fields={[
        field(t('settings.portability.azureAccountLabel'), draft.account, 'settings-azure-preflight-account', (account) => onChange(current => ({ ...current, account }))),
        field(t('settings.portability.azureContainerLabel'), draft.container, 'settings-azure-preflight-container', (container) => onChange(current => ({ ...current, container }))),
        field(t('settings.portability.azurePrefixLabel'), draft.prefix, 'settings-azure-preflight-prefix', (prefix) => onChange(current => ({ ...current, prefix }))),
      ]}
    />
  )
}

export function S3LivePreflightCard({ report, t }: { report?: S3LivePreflightReport; t: Translate }) {
  if (!report) return null
  return (
    <LivePreflightCard
      status={report.status}
      statusLabel={s3PreflightStatusLabel(report.status, t)}
      title={t('settings.portability.objectStorageS3PreflightTitle')}
      message={report.message}
      testId="object-storage-s3-live-preflight"
      t={t}
      stats={[
        [t('settings.portability.objectStorageBucket'), valueLabel(report.bucket_configured ? 'set' : 'missing', t)],
        [t('settings.portability.objectStorageRegion'), valueLabel(report.region_configured ? 'set' : 'default', t)],
        [t('settings.portability.objectStoragePrefix'), valueLabel(report.prefix_configured ? 'set' : 'none', t)],
        [t('settings.portability.objectStorageHeadBucket'), valueLabel(report.head_bucket_checked ? 'checked' : 'skipped', t)],
        [t('settings.portability.objectStorageList'), valueLabel(report.list_prefix_checked ? 'checked' : 'skipped', t)],
      ]}
    />
  )
}

export function AzureLivePreflightCard({ report, t }: { report?: AzureLivePreflightReport; t: Translate }) {
  if (!report) return null
  return (
    <LivePreflightCard
      status={report.status}
      statusLabel={azurePreflightStatusLabel(report.status, t)}
      title={t('settings.portability.objectStorageAzurePreflightTitle')}
      message={report.message}
      testId="object-storage-azure-live-preflight"
      t={t}
      stats={[
        [t('settings.portability.objectStorageAccount'), valueLabel(report.account_configured ? 'set' : 'missing', t)],
        [t('settings.portability.objectStorageContainer'), valueLabel(report.container_configured ? 'set' : 'missing', t)],
        [t('settings.portability.objectStoragePrefix'), valueLabel(report.prefix_configured ? 'set' : 'none', t)],
        [t('settings.portability.objectStorageContainerCheck'), valueLabel(report.container_checked ? 'checked' : 'skipped', t)],
        [t('settings.portability.objectStorageList'), valueLabel(report.list_prefix_checked ? 'checked' : 'skipped', t)],
      ]}
    />
  )
}

function LivePreflightControls({
  note,
  testId,
  fields,
}: {
  note: string
  testId: string
  fields: PreflightFieldProps[]
}) {
  return (
    <div className="grimoire-object-storage-preview grid gap-2 rounded-md border border-border p-2" data-testid={testId}>
      <div className="grid gap-2 sm:grid-cols-3">
        {fields.map((fieldProps) => <PreflightField key={fieldProps.testId} {...fieldProps} />)}
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">{note}</div>
    </div>
  )
}

interface PreflightFieldProps {
  label: string
  value: string
  testId: string
  onChange: (value: string) => void
}

function field(label: string, value: string, testId: string, onChange: (value: string) => void): PreflightFieldProps {
  return { label, value, testId, onChange }
}

function PreflightField({ label, value, testId, onChange }: PreflightFieldProps) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
      <span>{label}</span>
      <Input
        value={value}
        data-testid={testId}
        className="h-8 text-xs"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function LivePreflightCard({
  status,
  statusLabel,
  title,
  message,
  testId,
  t,
  stats,
}: {
  status: string
  statusLabel: string
  title: string
  message: string
  testId: string
  t: Translate
  stats: [string, string][]
}) {
  return (
    <div
      className="grimoire-object-storage-preview grid gap-2 rounded-md border border-border p-2"
      data-status={status}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={status === 'reachable' ? 'secondary' : 'outline'} className="rounded-md">
          {statusLabel}
        </Badge>
        <Badge variant="outline" className="rounded-md">{t('settings.portability.objectStorageReadOnly')}</Badge>
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] sm:grid-cols-5">
        {stats.map(([label, value]) => <PreflightStat key={label} label={label} value={value} />)}
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">
        {message} {t('settings.portability.objectStorageNoSecretsReturned')}
      </div>
    </div>
  )
}

function valueLabel(value: 'set' | 'missing' | 'default' | 'none' | 'checked' | 'skipped', t: Translate): string {
  const key = ({
    checked: 'settings.portability.objectStorageValueChecked',
    default: 'settings.portability.objectStorageValueDefault',
    missing: 'settings.portability.objectStorageValueMissing',
    none: 'settings.portability.objectStorageValueNone',
    set: 'settings.portability.objectStorageValueSet',
    skipped: 'settings.portability.objectStorageValueSkipped',
  } as const)[value]
  return t(key)
}

function s3PreflightStatusLabel(status: S3LivePreflightStatus, t: Translate): string {
  const key = ({
    auth_denied: 'settings.portability.objectStorageStatusAccessDenied',
    bucket_missing: 'settings.portability.objectStorageStatusBucketMissing',
    failed: 'settings.portability.objectStorageStatusFailed',
    missing_config: 'settings.portability.objectStorageStatusNotConfigured',
    missing_credentials: 'settings.portability.objectStorageStatusCredentialsMissing',
    network: 'settings.portability.objectStorageStatusNetworkFailed',
    reachable: 'settings.portability.objectStorageStatusReachable',
    throttled: 'settings.portability.objectStorageStatusThrottled',
  } as const)[status]
  return t(key)
}

function azurePreflightStatusLabel(status: AzureLivePreflightStatus, t: Translate): string {
  const key = ({
    auth_denied: 'settings.portability.objectStorageStatusAccessDenied',
    container_missing: 'settings.portability.objectStorageStatusContainerMissing',
    failed: 'settings.portability.objectStorageStatusFailed',
    missing_cli: 'settings.portability.objectStorageStatusAzureCliMissing',
    missing_config: 'settings.portability.objectStorageStatusNotConfigured',
    missing_credentials: 'settings.portability.objectStorageStatusLoginMissing',
    network: 'settings.portability.objectStorageStatusNetworkFailed',
    reachable: 'settings.portability.objectStorageStatusReachable',
    throttled: 'settings.portability.objectStorageStatusThrottled',
  } as const)[status]
  return t(key)
}

function PreflightStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="grimoire-preview-stat rounded border border-border px-2 py-1">
      <span className="block text-muted-foreground">{label}</span>
      <span className="grimoire-preview-stat__value font-semibold">{value}</span>
    </span>
  )
}
