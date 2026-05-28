import type { S3LivePreflightArgs } from '../utils/objectStorageSync'
import type { AzureLivePreflightArgs } from '../utils/objectStorageLivePreflight'

export interface S3PreflightDraft {
  bucket: string
  region: string
  prefix: string
}

export interface AzurePreflightDraft {
  account: string
  container: string
  prefix: string
}

export const EMPTY_S3_PREFLIGHT_DRAFT: S3PreflightDraft = { bucket: '', region: '', prefix: '' }
export const EMPTY_AZURE_PREFLIGHT_DRAFT: AzurePreflightDraft = { account: '', container: '', prefix: '' }

export function cleanS3PreflightArgs(draft: S3PreflightDraft): S3LivePreflightArgs {
  return {
    bucket: cleanPreflightValue(draft.bucket),
    region: cleanPreflightValue(draft.region),
    prefix: cleanPreflightValue(draft.prefix),
  }
}

export function cleanAzurePreflightArgs(draft: AzurePreflightDraft): AzureLivePreflightArgs {
  return {
    account: cleanPreflightValue(draft.account),
    container: cleanPreflightValue(draft.container),
    prefix: cleanPreflightValue(draft.prefix),
  }
}

function cleanPreflightValue(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed || undefined
}
