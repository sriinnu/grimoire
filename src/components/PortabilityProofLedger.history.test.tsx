import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import { createTranslator } from '../lib/i18n'
import { PortabilityProofLedger } from './PortabilityProofLedger'

const t = createTranslator('en')

function createStorageMock(): Storage {
  let store: Record<string, string> = {}
  return {
    get length() { return Object.keys(store).length },
    clear: vi.fn(() => { store = {} }),
    getItem: vi.fn((key: string) => store[key] ?? null),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  }
}

function loadReport(value: unknown) {
  fireEvent.click(screen.getByRole('button', { name: 'Paste redacted proof report' }))
  fireEvent.change(screen.getByLabelText('Redacted proof report JSON'), {
    target: { value: JSON.stringify(value) },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Load report' }))
}

describe('PortabilityProofLedger provider proof history', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
    window.localStorage.clear()
  })

  it('accumulates sanitized provider failure-state reports across separate proof runs', () => {
    const { unmount } = render(<PortabilityProofLedger t={t} />)

    loadReport({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T13:00:00Z',
      finished_at: '2026-05-28T13:05:00Z',
      provider_filter: 's3',
      summary: { status: 'passed', message: 'raw /Users/sriinnu/.aws s3://secret-bucket' },
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
    })

    loadReport({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T14:00:00Z',
      finished_at: '2026-05-28T14:05:00Z',
      provider_filter: 'azure',
      summary: { status: 'failed', message: 'raw azblob://secret-account token=abc' },
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
    })

    const history = window.localStorage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReportHistory) ?? ''
    expect(history).toContain('"provider_filter":"s3"')
    expect(history).toContain('"provider_filter":"azure"')
    expect(history).not.toContain('/Users/')
    expect(history).not.toContain('s3://')
    expect(history).not.toContain('azblob://')
    expect(history).not.toContain('secret-account')
    expect(history).not.toContain('token')

    unmount()
    render(<PortabilityProofLedger t={t} />)

    expect(screen.getByTestId('portability-proof-history')).toHaveTextContent('2 redacted reports')
    expect(screen.getByTestId('portability-proof-history')).toHaveTextContent('Latest failed at 2026-05-28T14:05:00Z')
    expect(screen.getByTestId('portability-proof-history')).toHaveTextContent('scope azure')
    expect(screen.getByTestId('portability-proof-history')).toHaveTextContent('S3 + Azure evidence')
    expect(screen.getByTestId('portability-proof-history')).toHaveTextContent(
      'no bucket, container, prefix, path, or secret values',
    )
    expect(screen.getByTestId('portability-proof-history')).not.toHaveTextContent('secret-account')
    expect(screen.getByTestId('portability-proof-live-provider-report-summary')).toHaveTextContent('Latest proof report: failed')
    expect(screen.getByTestId('portability-provider-failure-matrix')).toHaveTextContent('2 of 14 recorded')
    expect(screen.getByTestId('portability-provider-failure-s3-passed')).toHaveTextContent('recorded')
    expect(screen.getByTestId('portability-provider-failure-azure-auth')).toHaveTextContent('recorded')
  })
})
