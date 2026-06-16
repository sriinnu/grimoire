import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { VaultImagePreview } from './VaultImagePreview'

describe('VaultImagePreview', () => {
  it('renders selected vault images through an img element', () => {
    const entry = makeEntry({
      path: '/vault/attachments/logo.svg',
      filename: 'logo.svg',
      title: 'Grimoire Logo',
      fileKind: 'binary',
    })

    render(<VaultImagePreview entry={entry} />)

    expect(screen.getByTestId('vault-image-shell')).toBeInTheDocument()
    const image = screen.getByTestId('vault-image-preview')
    expect(image).toHaveAttribute('src', '/api/vault/file?path=%2Fvault%2Fattachments%2Flogo.svg')
    expect(image).toHaveAttribute('alt', 'Grimoire Logo')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(image).toHaveAttribute('draggable', 'false')

    const caption = within(screen.getByTestId('vault-image-caption'))
    expect(caption.getByText('logo.svg')).toBeInTheDocument()
    expect(caption.getByText('SVG')).toBeInTheDocument()
    expect(caption.getByText('Loading')).toHaveAttribute('data-state', 'loading')
  })

  it('moves from loading to loaded when the image resolves', () => {
    const entry = makeEntry({
      path: '/vault/attachments/logo.svg',
      filename: 'logo.svg',
      title: 'Grimoire Logo',
      fileKind: 'binary',
    })

    render(<VaultImagePreview entry={entry} />)

    expect(screen.getByTestId('vault-image-stage')).toHaveAttribute('data-state', 'loading')
    fireEvent.load(screen.getByTestId('vault-image-preview'))
    expect(screen.getByTestId('vault-image-stage')).toHaveAttribute('data-state', 'loaded')
    expect(screen.getByTestId('vault-image-preview')).toHaveAttribute('data-state', 'loaded')
    expect(within(screen.getByTestId('vault-image-caption')).getByText('Loaded')).toHaveAttribute(
      'data-state',
      'loaded',
    )
    expect(screen.queryByTestId('vault-image-loading')).not.toBeInTheDocument()
  })

  it('shows a visible failure state when the scoped image cannot load', () => {
    const entry = makeEntry({
      path: '/vault/attachments/missing.png',
      filename: 'missing.png',
      title: 'Missing image',
      fileKind: 'binary',
    })

    render(<VaultImagePreview entry={entry} />)

    fireEvent.error(screen.getByTestId('vault-image-preview'))
    expect(screen.getByTestId('vault-image-stage')).toHaveAttribute('data-state', 'error')
    expect(screen.getByTestId('vault-image-preview')).toHaveAttribute('data-state', 'error')
    expect(within(screen.getByTestId('vault-image-caption')).getByText('Unavailable')).toHaveAttribute(
      'data-state',
      'error',
    )
    expect(screen.getByTestId('vault-image-error')).toHaveTextContent('Image could not be loaded')
  })
})
