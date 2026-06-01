import { describe, expect, it } from 'vitest'
import {
  objectStorageFailureStateCoverage,
  objectStorageFailureStateSummary,
} from './objectStorageFailureStateMatrix'
import { parseObjectStorageLiveProofReport } from './objectStorageLiveProofReport'

describe('objectStorageFailureStateMatrix', () => {
  it('tracks only redacted pass and failure-state coverage', () => {
    const report = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T14:30:00Z',
      finished_at: '2026-05-28T14:35:00Z',
      provider_filter: 'all',
      summary: { status: 'failed', message: '/Users/sriinnu/.aws s3://secret-bucket token' },
      providers: [
        {
          id: 's3',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set' },
          optional: { GRIMOIRE_S3_REGION: 'set' },
          status: 'passed',
        },
        {
          id: 's3',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set' },
          optional: {},
          status: 'failed',
          failure_kind: 'permission',
          failure_stage: 'apply',
        },
        {
          id: 'azure',
          enabled: true,
          gate: { name: 'GRIMOIRE_AZURE_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_AZURE_CONTAINER: 'missing' },
          optional: {},
          status: 'missing_config',
        },
      ],
    }))

    const coverage = objectStorageFailureStateCoverage(report)

    expect(objectStorageFailureStateSummary(coverage)).toEqual({ recorded: 3, total: 14 })
    expect(coverage.find(item => item.id === 's3-passed')?.recorded).toBe(true)
    expect(coverage.find(item => item.id === 's3-permission')?.recorded).toBe(true)
    expect(coverage.find(item => item.id === 'azure-config')?.recorded).toBe(true)
    expect(coverage.find(item => item.id === 'azure-auth')?.recorded).toBe(false)
    expect(JSON.stringify(coverage)).not.toMatch(/s3:\/\/|\/Users\/|secret-bucket|token/i)
  })

  it('accumulates coverage across multiple redacted proof reports', () => {
    const s3Pass = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T14:30:00Z',
      finished_at: '2026-05-28T14:35:00Z',
      provider_filter: 's3',
      summary: { status: 'passed', message: 's3://secret-bucket /Users/sriinnu/.aws' },
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
    const azureAuthFailure = parseObjectStorageLiveProofReport(JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T15:30:00Z',
      finished_at: '2026-05-28T15:35:00Z',
      provider_filter: 'azure',
      summary: { status: 'failed', message: 'azblob://secret-account token=abc' },
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

    const coverage = objectStorageFailureStateCoverage([s3Pass!, azureAuthFailure!])

    expect(objectStorageFailureStateSummary(coverage)).toEqual({ recorded: 2, total: 14 })
    expect(coverage.find(item => item.id === 's3-passed')?.recorded).toBe(true)
    expect(coverage.find(item => item.id === 'azure-auth')?.recorded).toBe(true)
    expect(coverage.find(item => item.id === 'azure-passed')?.recorded).toBe(false)
    expect(JSON.stringify(coverage)).not.toMatch(/s3:\/\/|azblob:\/\/|\/Users\/|secret-bucket|token/i)
  })
})
