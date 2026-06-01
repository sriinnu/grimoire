import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND } from '../lib/portabilityProof'
import { PortabilityProofLedger } from './PortabilityProofLedger'

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

describe('PortabilityProofLedger i18n', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
  })

  it('localizes the German proof-ledger shell, dialog, details toggle, and copy state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<PortabilityProofLedger t={createTranslator('de')} />)

    expect(screen.getByText('Portabilitätsstatus')).toBeInTheDocument()
    expect(screen.getByText('Nachweisbericht')).toBeInTheDocument()
    expect(screen.getByText('Importer')).toBeInTheDocument()
    expect(screen.getByText('Exporte')).toBeInTheDocument()
    expect(screen.getByText('Desktop-Sync')).toBeInTheDocument()
    expect(screen.getByText('Objektspeicher')).toBeInTheDocument()
    expect(screen.getByText('Provider-Proof-Runner')).toBeInTheDocument()
    expect(screen.getByText('Lokaler Kapsel-Loop')).toBeInTheDocument()
    expect(screen.getByText('nicht gekoppelt')).toBeInTheDocument()
    expect(screen.getByText('JSON-Loop-Nachweis ausführen')).toBeInTheDocument()
    expect(screen.getByText('No-Write-Vorschauadapter', { exact: false })).toBeInTheDocument()
    expect(screen.queryByText('Portability Status')).not.toBeInTheDocument()
    expect(screen.queryByText('Object storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Local capsule loop')).not.toBeInTheDocument()
    expect(screen.queryByText('not paired')).not.toBeInTheDocument()
    expect(screen.queryByText('Reviewed export preview')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Redigierten Nachweisbericht einfügen' }))
    expect(screen.getByText('Nachweisbericht laden')).toBeInTheDocument()
    expect(screen.getByLabelText('Redigierter Nachweisbericht als JSON')).toBeInTheDocument()
    expect(screen.queryByText('Load Proof Report')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Eingefügten Nachweis löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bericht laden' }))
    expect(screen.getByText('Füge einen redigierten grimoire-object-storage-live-proof-v1 JSON-Bericht ein.')).toBeInTheDocument()
    fireEvent.keyDown(document, { code: 'Escape', key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Nachweisbericht laden')).not.toBeInTheDocument())

    const row = within(screen.getByTestId('portability-proof-provider-proof-runner'))
    fireEvent.click(row.getByRole('button', { name: 'Entwickler-Nachweisdetails' }))
    expect(row.getByRole('button', { name: 'Entwickler-Nachweis ausblenden' })).toBeInTheDocument()
    expect(row.getByLabelText('Provider-Proof-Runner Einrichtungscheckliste')).toBeInTheDocument()
    expect(row.getByText(/Noch zu beweisen:/)).toBeInTheDocument()
    expect(row.getByText(/echte S3\/Azure-Zugangsdaten/)).toBeInTheDocument()
    fireEvent.click(row.getByRole('button', { name: 'Trockenlauf kopieren-Befehl' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND))
    await waitFor(() => expect(row.getByText('Kopiert')).toBeInTheDocument())
    expect(row.queryByText('Developer proof details')).not.toBeInTheDocument()
    expect(row.queryByText('Copied')).not.toBeInTheDocument()
  })
})
