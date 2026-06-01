import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

export type AzureLivePreflightStatus =
  | 'missing_config'
  | 'missing_cli'
  | 'missing_credentials'
  | 'auth_denied'
  | 'container_missing'
  | 'network'
  | 'throttled'
  | 'reachable'
  | 'failed'

export interface AzureLivePreflightReport {
  provider_id: 'azure-blob'
  proof_level: 'live-read-only-preflight'
  configured: boolean
  status: AzureLivePreflightStatus
  account_configured: boolean
  container_configured: boolean
  prefix_configured: boolean
  container_checked: boolean
  list_prefix_checked: boolean
  message: string
  checked_at: string
}

export interface AzureLivePreflightArgs {
  account?: string
  container?: string
  prefix?: string
}

/** Runs a read-only Azure Blob proof through local Azure CLI login without vault writes. */
export function runAzureLivePreflight(args: AzureLivePreflightArgs = {}): Promise<AzureLivePreflightReport> {
  const payload = {
    account: preflightValue(args.account),
    container: preflightValue(args.container),
    prefix: preflightValue(args.prefix),
  }
  return isTauri()
    ? invoke<AzureLivePreflightReport>('storage_azure_live_preflight', payload)
    : mockInvoke<AzureLivePreflightReport>('storage_azure_live_preflight', payload)
}

/** Summarizes a redacted Azure preflight without leaking provider output. */
export function formatAzureLivePreflightToast(report: AzureLivePreflightReport): string {
  return `Azure live read-only preflight: ${azureLivePreflightStatusLabel(report.status)}`
}

export function azureLivePreflightStatusLabel(status: AzureLivePreflightStatus): string {
  switch (status) {
    case 'missing_config':
      return 'not configured'
    case 'missing_cli':
      return 'Azure CLI missing'
    case 'missing_credentials':
      return 'login missing'
    case 'auth_denied':
      return 'access denied'
    case 'container_missing':
      return 'container missing'
    case 'network':
      return 'network failed'
    case 'throttled':
      return 'throttled'
    case 'reachable':
      return 'reachable'
    case 'failed':
      return 'failed'
  }
}

function preflightValue(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
