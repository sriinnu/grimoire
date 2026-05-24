import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ContextCapsulePackagePreview } from '../lib/contextCapsule'
import { ContextCapsuleDialog } from './ContextCapsuleDialog'

const packagePreview: ContextCapsulePackagePreview = {
  title: 'Context Capsule Package',
  protectedContext: false,
  markdown: [
    '# Context Capsule Package',
    '',
    'Privacy: Local-only notes are withheld.',
    '',
    '## Included Notes',
    '- Source 1: active / Project / Grimoire',
  ].join('\n'),
}

describe('ContextCapsuleDialog', () => {
  it('shows a read-only local package preview and closes on request', () => {
    const onClose = vi.fn()
    render(<ContextCapsuleDialog open packagePreview={packagePreview} onClose={onClose} />)

    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('Review only')
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('No handoff')
    const preview = screen.getByRole('textbox', { name: 'Context Capsule Markdown package preview' })
    expect(preview).toHaveValue(packagePreview.markdown)
    expect(preview).toHaveAttribute('readonly')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
