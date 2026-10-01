import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { MentionsRow } from './MentionsRow'

const contents: Record<string, string> = {
  '/vault/a.md': 'I keep my notes in the grimoire every night.',
  '/vault/b.md': 'Only in code: `Grimoire`',
  '/vault/c.md': 'Already [[Grimoire]] here.',
}

vi.mock('../../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: vi.fn((command: string, args: { path: string }) => Promise.resolve(contents[args.path] ?? '')),
}))

vi.mock('../../lib/bodyIndex/bodyIndex', () => ({
  getBodyIndex: () => ({
    ready: Promise.resolve(),
    pathsMentioning: vi.fn(() => Promise.resolve(['/vault/a.md', '/vault/b.md', '/vault/c.md', '/vault/self.md'])),
    pathsLinkingTo: vi.fn(() => Promise.resolve(['/vault/c.md'])),
  }),
}))

const self = makeEntry({ path: '/vault/self.md', filename: 'self.md', title: 'Grimoire' })
const a = makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Nightly' })
const b = makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Code Only' })
const c = makeEntry({ path: '/vault/c.md', filename: 'c.md', title: 'Linked Already' })

describe('MentionsRow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists only pages that mention the title in prose, and links the first mention on click', async () => {
    const onReplaceContent = vi.fn().mockResolvedValue(undefined)
    render(
      <MentionsRow entry={self} entries={[self, a, b, c]} connectedPaths={new Set()} onNavigate={vi.fn()} onReplaceContent={onReplaceContent} />,
    )

    await waitFor(() => expect(screen.getByTestId('unlinked-mentions')).toHaveTextContent('Mentioned but not linked (1)'))
    expect(screen.getByText('Nightly')).toBeInTheDocument()
    expect(screen.queryByText('Code Only')).toBeNull()
    expect(screen.queryByText('Linked Already')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    await waitFor(() => expect(onReplaceContent).toHaveBeenCalledWith('/vault/a.md', 'I keep my notes in the [[Grimoire|grimoire]] every night.'))
    expect(screen.getByTestId('unlinked-mention')).toHaveAttribute('data-linked', 'true')
  })

  it('skips pages that are already connected and renders nothing when none remain', async () => {
    const { container } = render(
      <MentionsRow entry={self} entries={[self, a]} connectedPaths={new Set(['/vault/a.md'])} onNavigate={vi.fn()} />,
    )
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
