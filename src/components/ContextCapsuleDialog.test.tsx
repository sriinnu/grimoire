import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContextCapsulePackagePreview, ContextCapsulePreview } from '../lib/contextCapsule'
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

const preview: ContextCapsulePreview = {
  state: 'ready',
  title: 'Context Capsule',
  includedNotes: [
    { kind: 'active', title: 'Grimoire', type: 'Project', path: 'Projects/Grimoire.md' },
    { kind: 'linked', title: 'Roadmap', type: 'Note', path: 'Projects/Roadmap.md' },
  ],
  exclusions: [{ label: 'Local-only notes', reason: '2 withheld' }],
  rules: ['Local-only notes stay local'],
  counts: { linkedNotes: 1, noteListItems: 0, openTabs: 0, selectedNotes: 2, exclusions: 2 },
  projectMap: { graphEdges: 0, graphNodes: 0, graphOmitted: 2, relationshipEdges: 1 },
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
        preview={preview}
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
    expect(screen.getByTestId('context-capsule-manifest')).toHaveAttribute('data-locality', 'source-safe')
    expect(screen.getByTestId('context-capsule-manifest')).toHaveTextContent('Mode')
    expect(screen.getByTestId('context-capsule-manifest')).toHaveTextContent('Review')
    expect(screen.getByTestId('context-capsule-manifest')).toHaveTextContent('Sources')
    expect(screen.getByTestId('context-capsule-manifest')).toHaveTextContent('Pinned')
    expect(screen.getByTestId('context-capsule-manifest')).toHaveTextContent('Excluded')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('grimoire.context-manifest.v1')
    const markdownPreview = screen.getByRole('textbox', { name: 'Context Capsule Markdown package preview' })
    expect(markdownPreview).toHaveValue(packagePreview.markdown)
    expect(markdownPreview).toHaveAttribute('readonly')

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
        preview={preview}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(packagePreview.markdown))
    await waitFor(() => {
      expect(screen.getByTestId('context-capsule-copy')).toHaveTextContent('Copied')
      expect(screen.getByTestId('context-capsule-copy-status')).toHaveTextContent('Portable package copied locally.')
    })
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('No handoff')
  })

  it('pins, excludes, and rebuilds the live structured manifest', () => {
    render(
      <ContextCapsuleDialog
        open
        packagePreview={packagePreview}
        preview={preview}
        onClose={vi.fn()}
      />,
    )

    const initialManifest = screen.getByTestId('context-manifest-json').textContent
    fireEvent.click(screen.getByRole('button', { name: 'Pin Roadmap' }))
    expect(screen.getByTestId('context-capsule-manifest')).toHaveTextContent('Pinned1')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('user pin')

    fireEvent.click(screen.getByRole('button', { name: 'Exclude Grimoire' }))
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('user excluded')

    fireEvent.click(screen.getByRole('button', { name: 'Rebuild' }))
    expect(screen.getByTestId('context-manifest-json').textContent).not.toBe(initialManifest)
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('pkg-1234abcd:context:2')
  })
})
