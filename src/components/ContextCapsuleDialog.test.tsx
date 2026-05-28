import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContextCapsulePackagePreview } from '../lib/contextCapsule'
import { ContextCapsuleDialog } from './ContextCapsuleDialog'

const packagePreview: ContextCapsulePackagePreview = {
  title: 'Context Capsule Package',
  preflight: { heldLocalCount: 2, sourceCount: 1, trimmedCount: 0 },
  protectedContext: false,
  reviewReceipt: 'pkg-1234abcd',
  markdown: [
    '# Context Capsule Package',
    '',
    'Privacy: Local-only notes are withheld.',
    '',
    '## Egress Matrix',
    '- Agents: Review packet; Reviewed titles, types, and paths.',
    '',
    '## Included Notes',
    '- Source 1: active / Project / Grimoire',
  ].join('\n'),
}

describe('ContextCapsuleDialog', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard')
    vi.restoreAllMocks()
  })

  it('shows a read-only local package preview and closes on request', () => {
    const onClose = vi.fn()
    render(
      <ContextCapsuleDialog
        defaultAiAgent="chitragupta"
        defaultAiProvider="google"
        defaultAiModel="gemini-2.5-pro"
        open
        packagePreview={packagePreview}
        onClose={onClose}
      />,
    )

    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('Review only')
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('No handoff')
    expect(screen.getByTestId('context-capsule-review-receipt')).toHaveTextContent('pkg-1234abcd')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('provider: google')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('model: gemini-2.5-pro')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('Source-safe packet')
    expect(screen.getByTestId('agent-preflight-gate')).toHaveTextContent('Allowed context')
    expect(screen.getByTestId('agent-preflight-gate')).toHaveTextContent('Held local')
    expect(screen.getByTestId('agent-preflight-gate')).toHaveTextContent('2')
    const preview = screen.getByRole('textbox', { name: 'Context Capsule Markdown package preview' })
    expect(preview).toHaveValue(packagePreview.markdown)
    expect(preview).toHaveAttribute('readonly')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('copies the reviewed source-safe Markdown package without starting a handoff', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <ContextCapsuleDialog
        open
        packagePreview={packagePreview}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(packagePreview.markdown))
    expect(screen.getByTestId('context-capsule-copy')).toHaveTextContent('Copied')
    expect(screen.getByTestId('context-capsule-copy-status')).toHaveTextContent('Portable package copied locally.')
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('No handoff')
  })
})
