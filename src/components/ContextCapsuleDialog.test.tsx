import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContextCapsulePackagePreview, ContextCapsulePreview } from '../lib/contextCapsule'
import type { ModifiedFile, VaultEntry } from '../types'
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

const manifestEntries = [
  { path: '/vault/Projects/Grimoire.md', title: 'Grimoire', properties: {} },
] as VaultEntry[]

const modifiedFiles = [
  { path: '/vault/Projects/Grimoire.md', relativePath: 'Projects/Grimoire.md', status: 'modified' },
] as ModifiedFile[]

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

    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('Local inspection')
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('No agent run')
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
    expect(screen.getByTestId('context-capsule-manifest')).toHaveTextContent('Budget')
    expect(screen.getByTestId('context-manifest-sources')).toHaveTextContent('Sources in this review')
    expect(screen.getAllByTestId('context-manifest-source-row')).toHaveLength(2)
    expect(screen.getByTestId('context-review-summary')).toHaveTextContent('Note bodies and private lanes stay on this Mac.')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('grimoire.context-manifest.v1')
    expect(screen.queryByRole('textbox', { name: 'Context Capsule Markdown package preview' })).not.toBeInTheDocument()

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
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('No agent run')
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

  it('lets the user select a token budget and records the revisioned decision', () => {
    render(
      <ContextCapsuleDialog open packagePreview={packagePreview} preview={preview} onClose={vi.fn()} />,
    )

    expect(screen.getByTestId('context-manifest-budget')).toHaveTextContent('8k')
    fireEvent.click(screen.getByRole('button', { name: '2k' }))

    expect(screen.getByRole('button', { name: '2k' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('"maximumTokens": 2000')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('pkg-1234abcd:context:2')
  })

  it('shows the reviewed, visible working-tree metadata without diff content', () => {
    render(
      <ContextCapsuleDialog
        open
        packagePreview={packagePreview}
        preview={preview}
        entries={manifestEntries}
        modifiedFiles={modifiedFiles}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('context-manifest-workspace')).toHaveTextContent('1 visible Git change')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('Projects/Grimoire.md')
    expect(screen.getByTestId('context-manifest-json')).toHaveTextContent('git-diff')
  })

  it('requires an explicit action before handing the reviewed manifest to the next request', () => {
    const onUseContextManifest = vi.fn()
    render(
      <ContextCapsuleDialog
        open
        packagePreview={packagePreview}
        preview={preview}
        onUseContextManifest={onUseContextManifest}
        onClose={vi.fn()}
      />,
    )

    expect(onUseContextManifest).not.toHaveBeenCalled()
    expect(screen.getByTestId('context-next-request')).toHaveTextContent('Nothing is sent from this screen.')
    expect(screen.getByTestId('use-context-manifest')).toHaveTextContent('Attach to next request')
    fireEvent.click(screen.getByTestId('use-context-manifest'))
    expect(onUseContextManifest).toHaveBeenCalledWith(expect.objectContaining({
      schemaVersion: 'grimoire.context-manifest.v1',
      requestId: 'context-review:pkg-1234abcd',
    }))
  })
})
