import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OBJECT_STORAGE_LIVE_PROOF_COMMAND } from '../lib/portabilityProof'
import { PortabilityProofLedger } from './PortabilityProofLedger'

describe('PortabilityProofLedger', () => {
  it('shows the redacted provider proof runner without claiming provider-proven sync', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<PortabilityProofLedger />)

    const row = within(screen.getByTestId('portability-proof-provider-proof-runner'))
    expect(row.getByText('Provider proof runner')).toBeInTheDocument()
    expect(row.getByText('available')).toBeInTheDocument()
    expect(row.getByText('live proof runner')).toBeInTheDocument()
    expect(row.getAllByText(/pnpm test:object-storage-live -- --report/)).toHaveLength(2)
    expect(row.getByText(/stores only gate\/config set-missing state/)).toBeInTheDocument()
    expect(row.getByText(/Needs real S3\/Azure credentials/)).toBeInTheDocument()
    fireEvent.click(row.getByRole('button', { name: 'Copy provider proof runner command' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OBJECT_STORAGE_LIVE_PROOF_COMMAND))
    expect(row.getByText('Copied')).toBeInTheDocument()
    expect(row.queryByText(/provider-proven sync/i)).not.toBeInTheDocument()
    expect(row.queryByText(/s3:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/azblob:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/\/Users\//i)).not.toBeInTheDocument()
  })
})
