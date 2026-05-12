import { render, screen } from '@testing-library/react'
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

    const image = screen.getByTestId('vault-image-preview')
    expect(image).toHaveAttribute('src', '/vault/attachments/logo.svg')
    expect(image).toHaveAttribute('alt', 'Grimoire Logo')
    expect(screen.getByText('logo.svg')).toBeInTheDocument()
  })
})
