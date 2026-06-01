import { describe, expect, it } from 'vitest'
import {
  appendObjectStorageLiveProofReport,
  objectStorageReportProofs,
  parseObjectStorageLiveProofReport,
  parseObjectStorageLiveProofReports,
} from './objectStorageLiveProofReport'

describe('objectStorageLiveProofReport', () => {
  it('loads sanitized provider proof runner reports without provider targets', () => {
    const report = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T12:30:00Z',
      finished_at: '2026-05-28T12:35:00Z',
      provider_filter: 'all',
      summary: { status: 'passed', message: 'wrote /Users/sriinnu/.aws and s3://secret-bucket' },
      providers: [
        {
          id: 's3',
          label: 's3://secret-bucket/private-prefix',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set', AWS_SECRET_ACCESS_KEY: 'set' },
          optional: { GRIMOIRE_S3_REGION: 'set', GRIMOIRE_S3_PREFIX: 'set', TOKEN: 'set' },
          status: 'passed',
          message: 'provider returned token=abc',
        },
        {
          id: 'azure',
          label: 'azblob://secret-account/private-container',
          enabled: true,
          gate: { name: 'GRIMOIRE_AZURE_LIVE_WRITE_PROOF', state: 'set' },
          required: {
            GRIMOIRE_AZURE_CONTAINER: 'missing',
            GRIMOIRE_AZURE_STORAGE_ACCOUNT: 'set',
            PASSWORD: 'set',
          },
          optional: { GRIMOIRE_AZURE_PREFIX: 'missing' },
          status: 'missing_config',
          message: '/Users/sriinnu/Library/Azure leaked here',
        },
      ],
    }))

    expect(report?.summary.message).toBe('Redacted provider proof report loaded.')
    expect(report?.providers[0]).toMatchObject({
      id: 's3',
      gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
      required: { GRIMOIRE_S3_BUCKET: 'set' },
      optional: { GRIMOIRE_S3_REGION: 'set', GRIMOIRE_S3_PREFIX: 'set' },
      status: 'passed',
    })
    expect(report?.providers[1]?.required).toEqual({
      GRIMOIRE_AZURE_CONTAINER: 'missing',
      GRIMOIRE_AZURE_STORAGE_ACCOUNT: 'set',
    })

    expect(objectStorageReportProofs(report)).toEqual([
      {
        id: 'provider-report-summary',
        label: 'Latest proof report',
        status: 'passed',
        detail: 'scope all; 1 passed, 1 missing config; generated 2026-05-28T12:30:00Z; finished 2026-05-28T12:35:00Z',
      },
      {
        id: 's3-provider-proof',
        label: 'S3 provider proof',
        status: 'passed',
        detail: 'gate set; 1/1 required set; 2/2 optional set; preview/apply/pull proof passed',
      },
      {
        id: 'azure-provider-proof',
        label: 'Azure provider proof',
        status: 'missing config',
        detail: 'gate set; 1/2 required set; 0/1 optional set; missing config recorded; failure config at config',
      },
    ])
    expect(JSON.stringify([report, objectStorageReportProofs(report)])).not.toMatch(
      /s3:\/\/|azblob:\/\/|\/Users\/|secret-bucket|AWS_SECRET_ACCESS_KEY|TOKEN|PASSWORD/,
    )
  })

  it('keeps redacted provider failure stage and kind without raw provider output', () => {
    const report = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T14:30:00Z',
      finished_at: '2026-05-28T14:35:00Z',
      provider_filter: 's3',
      summary: { status: 'failed', message: 'raw /Users/sriinnu/.aws s3://secret-bucket token=abc' },
      providers: [
        {
          id: 's3',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set' },
          optional: { GRIMOIRE_S3_REGION: 'set' },
          status: 'failed',
          failure_kind: 'permission',
          failure_stage: 'apply',
          message: 'AccessDenied for s3://secret-bucket/private-prefix with token=abc',
        },
      ],
    }))

    expect(report?.providers[0]).toMatchObject({
      failure_kind: 'permission',
      failure_stage: 'apply',
      status: 'failed',
    })
    expect(objectStorageReportProofs(report)).toEqual([
      {
        id: 'provider-report-summary',
        label: 'Latest proof report',
        status: 'failed',
        detail: 'scope s3; 1 failed; generated 2026-05-28T14:30:00Z; finished 2026-05-28T14:35:00Z',
      },
      {
        id: 's3-provider-proof',
        label: 'S3 provider proof',
        status: 'failed',
        detail: 'gate set; 1/1 required set; 1/1 optional set; provider proof failed; failure permission at apply',
      },
    ])
    expect(JSON.stringify(objectStorageReportProofs(report))).not.toMatch(/s3:\/\/|\/Users\/|secret-bucket|token/i)
  })

  it('sanitizes proof report timestamps before storing pasted report state', () => {
    const report = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '/Users/sriinnu/.aws s3://secret-bucket',
      finished_at: 'azblob://secret-account/container',
      provider_filter: 's3',
      summary: { status: 'passed', message: 'done' },
      providers: [
        {
          id: 's3',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set' },
          optional: {},
          status: 'passed',
        },
      ],
    }))

    expect(report?.generated_at).toBe('redacted-time')
    expect(report?.finished_at).toBe('redacted-time')
    expect(JSON.stringify(report)).not.toMatch(/\/Users\/|s3:\/\/|azblob:\/\//)
  })

  it('builds a sanitized multi-run proof history without raw provider targets', () => {
    const s3Report = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T14:30:00Z',
      finished_at: '2026-05-28T14:35:00Z',
      provider_filter: 's3',
      summary: { status: 'passed', message: 'raw s3://secret-bucket /Users/sriinnu/.aws' },
      providers: [
        {
          id: 's3',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set' },
          optional: {},
          status: 'passed',
        },
      ],
    }))
    const azureReport = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T15:30:00Z',
      finished_at: '2026-05-28T15:35:00Z',
      provider_filter: 'azure',
      summary: { status: 'failed', message: 'raw azblob://secret-account/container token=abc' },
      providers: [
        {
          id: 'azure',
          enabled: true,
          gate: { name: 'GRIMOIRE_AZURE_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_AZURE_CONTAINER: 'set' },
          optional: {},
          status: 'failed',
          failure_kind: 'auth',
          failure_stage: 'preview',
        },
      ],
    }))

    const firstHistory = appendObjectStorageLiveProofReport(null, s3Report!)
    const nextHistory = appendObjectStorageLiveProofReport(firstHistory, azureReport!)
    const reports = parseObjectStorageLiveProofReports(JSON.stringify(nextHistory))

    expect(reports).toHaveLength(2)
    expect(reports.at(-1)?.provider_filter).toBe('azure')
    expect(JSON.stringify(nextHistory)).not.toMatch(/s3:\/\/|azblob:\/\/|\/Users\/|secret-bucket|token/i)
  })
})
