import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortabilityProofLedger } from './PortabilityProofLedger'

describe('PortabilityProofLedger', () => {
  it('shows the redacted provider proof runner without claiming provider-proven sync', () => {
    render(<PortabilityProofLedger />)

    const row = within(screen.getByTestId('portability-proof-provider-proof-runner'))
    expect(row.getByText('Provider proof runner')).toBeInTheDocument()
    expect(row.getByText('available')).toBeInTheDocument()
    expect(row.getByText('live proof runner')).toBeInTheDocument()
    expect(row.getByText(/pnpm test:object-storage-live -- --report/)).toBeInTheDocument()
    expect(row.getByText(/stores only gate\/config set-missing state/)).toBeInTheDocument()
    expect(row.getByText(/Needs real S3\/Azure credentials/)).toBeInTheDocument()
    expect(row.queryByText(/provider-proven sync/i)).not.toBeInTheDocument()
    expect(row.queryByText(/s3:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/azblob:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/\/Users\//i)).not.toBeInTheDocument()
  })
})
