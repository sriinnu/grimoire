import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUnlinkedMentions, type UnlinkedMention } from './useUnlinkedMentions'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

interface HookEntry {
  path: string
  title: string
  aliases: string[]
  modifiedAt: number | null
}

const noteA: HookEntry = { path: '/vault/alpha.md', title: 'Alpha', aliases: [], modifiedAt: 100 }
const noteB: HookEntry = { path: '/vault/beta.md', title: 'Beta', aliases: [], modifiedAt: 200 }

const mentionOfA: UnlinkedMention = {
  path: '/vault/notes/monday.md',
  title: 'Monday Notes',
  line: 4,
  context: 'Shipped alpha fixes before lunch.',
  matchedText: 'alpha',
}

const mentionOfB: UnlinkedMention = {
  path: '/vault/notes/tuesday.md',
  title: 'Tuesday Notes',
  line: 2,
  context: 'Planning beta next.',
  matchedText: 'beta',
}

function mentionsByNote(notePath: unknown): UnlinkedMention[] {
  return notePath === noteA.path ? [mentionOfA] : [mentionOfB]
}

function scanCallsFor(notePath: string): number {
  return mockInvoke.mock.calls.filter(
    ([cmd, args]) =>
      cmd === 'find_note_mentions' &&
      (args as Record<string, unknown>).notePath === notePath,
  ).length
}

function renderMentionsHook(initialEntry: HookEntry) {
  return renderHook(
    ({ entry }: { entry: HookEntry }) => useUnlinkedMentions(entry, '/vault'),
    { initialProps: { entry: initialEntry } },
  )
}

describe('useUnlinkedMentions', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('drops the post-link rescan when the active note changes mid-link', async () => {
    let resolveLink: ((value: null) => void) | undefined
    mockInvoke.mockImplementation((cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'find_note_mentions') return Promise.resolve(mentionsByNote(args?.notePath))
      if (cmd === 'link_unlinked_mention') {
        return new Promise((resolve) => { resolveLink = resolve })
      }
      return Promise.resolve(null)
    })

    const { result, rerender } = renderMentionsHook(noteA)
    await waitFor(() => expect(result.current.mentions).toEqual([mentionOfA]))

    let linkPromise: Promise<void> = Promise.resolve()
    act(() => { linkPromise = result.current.linkMention(mentionOfA) })
    await waitFor(() => expect(resolveLink).toBeDefined())
    expect(mockInvoke).toHaveBeenCalledWith(
      'link_unlinked_mention',
      expect.objectContaining({ targetTitle: 'Alpha', matchedText: 'alpha' }),
    )

    rerender({ entry: noteB })
    await waitFor(() => expect(result.current.mentions).toEqual([mentionOfB]))

    const scansForABefore = scanCallsFor(noteA.path)
    await act(async () => {
      resolveLink?.(null)
      await linkPromise
    })

    expect(scanCallsFor(noteA.path)).toBe(scansForABefore)
    expect(result.current.mentions).toEqual([mentionOfB])
  })

  it('refuses to link a mention captured from a previous note scan', async () => {
    mockInvoke.mockImplementation((cmd: string, args?: Record<string, unknown>) =>
      Promise.resolve(cmd === 'find_note_mentions' ? mentionsByNote(args?.notePath) : null),
    )

    const { result, rerender } = renderMentionsHook(noteA)
    await waitFor(() => expect(result.current.mentions).toEqual([mentionOfA]))
    const staleLink = result.current.linkMention

    rerender({ entry: noteB })
    await waitFor(() => expect(result.current.mentions).toEqual([mentionOfB]))

    await act(async () => { await staleLink(mentionOfA) })

    const linkCalls = mockInvoke.mock.calls.filter(([cmd]) => cmd === 'link_unlinked_mention')
    expect(linkCalls).toHaveLength(0)
    expect(result.current.mentions).toEqual([mentionOfB])
  })

  it('neither clears nor re-scans for a new entry object with the same path and modifiedAt', async () => {
    mockInvoke.mockImplementation((cmd: string) =>
      Promise.resolve(cmd === 'find_note_mentions' ? [mentionOfA] : null),
    )

    const { result, rerender } = renderMentionsHook(noteA)
    await waitFor(() => expect(result.current.mentions).toEqual([mentionOfA]))
    expect(scanCallsFor(noteA.path)).toBe(1)

    rerender({ entry: { ...noteA, aliases: [] } })
    expect(result.current.mentions).toEqual([mentionOfA])

    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)) })
    expect(scanCallsFor(noteA.path)).toBe(1)
    expect(result.current.mentions).toEqual([mentionOfA])
  })

  it('re-scans when the same note gets a fresh modifiedAt', async () => {
    mockInvoke.mockImplementation((cmd: string) =>
      Promise.resolve(cmd === 'find_note_mentions' ? [mentionOfA] : null),
    )

    const { result, rerender } = renderMentionsHook(noteA)
    await waitFor(() => expect(result.current.mentions).toEqual([mentionOfA]))
    expect(scanCallsFor(noteA.path)).toBe(1)

    rerender({ entry: { ...noteA, modifiedAt: 101 } })
    await waitFor(() => expect(scanCallsFor(noteA.path)).toBe(2))
    await waitFor(() => expect(result.current.mentions).toEqual([mentionOfA]))
  })
})
