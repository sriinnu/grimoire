import { describe, expect, it } from 'vitest'
import {
  listPortabilityProofRows,
  OBJECT_STORAGE_LIVE_PROOF_COMMAND,
  OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
  portabilityProofLevelLabel,
} from './portabilityProof'

describe('portabilityProof', () => {
  it('separates support status from proof level', () => {
    const rows = listPortabilityProofRows()
    const rowById = Object.fromEntries(rows.map(row => [row.id, row]))

    expect(rows.map(row => row.id)).toEqual([
      'imports',
      'exports',
      'desktop-sync',
      'object-storage',
      'provider-proof-runner',
    ])
    expect(rowById.imports.supportStatus).toBe('ready')
    expect(rowById.imports.proofLevel).toBe('fixture-regression')
    expect(rowById['desktop-sync'].proofLevel).toBe('provider-managed-local-folder')
    expect(rowById['object-storage'].supportStatus).toBe('fixture')
    expect(rowById['object-storage'].proofLevel).toBe('live-read-only-plus-local-mirror')
    expect(rowById['provider-proof-runner'].supportStatus).toBe('available')
    expect(rowById['provider-proof-runner'].proofLevel).toBe('live-provider-proof-runner')
    expect(rowById['provider-proof-runner'].commands?.map(command => command.command)).toEqual([
      OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
      OBJECT_STORAGE_LIVE_PROOF_COMMAND,
    ])
    expect(rowById['provider-proof-runner'].providerRequirements?.map(requirement => requirement.id)).toEqual([
      's3',
      'azure',
    ])
  })

  it('keeps remaining provider gaps explicit without leaking local paths', () => {
    const combined = listPortabilityProofRows()
      .flatMap(row => [
        row.detail,
        row.evidence,
        row.remainingProof,
        ...(row.commands ?? []).flatMap(command => [command.command, command.detail]),
        ...(row.providerRequirements ?? []).flatMap(requirement => [
          requirement.gate,
          ...requirement.required,
          ...requirement.optional,
          requirement.proofNeed,
        ]),
      ])
      .join('\n')

    expect(combined).toContain('Apple Journal')
    expect(combined).toContain('fresh real-world exports')
    expect(combined).toContain('JSON/SQLite capsules have local import regressions')
    expect(combined).toContain('S3 has a read-only HeadBucket/ListObjectsV2 preflight')
    expect(combined).toContain('Azure has a read-only CLI container/list preflight')
    expect(combined).toContain('provider preview/apply contracts')
    expect(combined).toContain('pnpm test:object-storage-live -- --report .tmp/object-storage-live-proof.json')
    expect(combined).toContain('pnpm test:object-storage-live -- --dry-run --report .tmp/object-storage-live-proof.json')
    expect(combined).toContain('pass/fail/missing-config status')
    expect(combined).toContain('No provider writes')
    expect(combined).toContain('GRIMOIRE_S3_LIVE_WRITE_PROOF')
    expect(combined).toContain('GRIMOIRE_AZURE_STORAGE_ACCOUNT')
    expect(combined).toContain('permission, auth, conflict')
    expect(combined).toContain('exact preview signatures')
    expect(combined).toContain('local read proof for iCloud/GDrive')
    expect(combined).toContain('Run the live provider proof runner')
    expect(combined).toContain('Provider quota, offline recovery')
    expect(combined).not.toContain('capsule re-import')
    expect(combined).not.toMatch(/\/Users\//)
    expect(combined).not.toMatch(/secret|token|password/i)
  })

  it('uses compact user-facing proof labels', () => {
    expect(portabilityProofLevelLabel('fixture-regression')).toBe('fixture/regression')
    expect(portabilityProofLevelLabel('local-regression')).toBe('local regression')
    expect(portabilityProofLevelLabel('provider-managed-local-folder')).toBe('desktop folder')
    expect(portabilityProofLevelLabel('local-mirror-fixture')).toBe('local mirror')
    expect(portabilityProofLevelLabel('live-read-only-plus-local-mirror')).toBe('preflight + preview')
    expect(portabilityProofLevelLabel('live-provider-proof-runner')).toBe('live proof runner')
  })
})
