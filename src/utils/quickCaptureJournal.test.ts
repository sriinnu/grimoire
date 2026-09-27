import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import type { VaultEntry } from '../types'

type InvokeArgs = { path: string; content?: string }

const { content, mockInvoke, addMockEntry } = vi.hoisted(() => {
  const content: Record<string, string> = {}
  return {
    content,
    mockInvoke: vi.fn(async (command: string, args: InvokeArgs) => {
      if (command === 'get_note_content') return content[args.path] ?? ''
      if (command === 'save_note_content') content[args.path] = args.content ?? ''
      return null
    }),
    addMockEntry: vi.fn((entry: { path: string }, body: string) => { content[entry.path] = body }),
  }
})

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
  addMockEntry,
  updateMockContent: vi.fn(),
}))

import { appendQuickCaptureToTodayJournal } from './quickCaptureJournal'

const now = new Date(2026, 8, 26, 14, 5)

function makeDeps(entries: VaultEntry[], openPaths: string[] = []) {
  return {
    entries,
    vaultPath: '/vault',
    openPaths,
    flushBeforeWrite: vi.fn<(path: string) => Promise<void>>(async () => {}),
    addEntry: vi.fn(),
    removeEntry: vi.fn(),
    updateEntry: vi.fn(),
    updateTabContent: vi.fn(),
    addPendingSave: vi.fn(),
    removePendingSave: vi.fn(),
    loadModifiedFiles: vi.fn(async () => {}),
  }
}

describe('appendQuickCaptureToTodayJournal', () => {
  beforeEach(() => {
    for (const key of Object.keys(content)) delete content[key]
    mockInvoke.mockClear()
    addMockEntry.mockClear()
  })

  it('appends a bullet to an existing journal without opening it', async () => {
    const journal = makeEntry({ path: '/vault/journal-2026-09-26.md', title: 'Journal 2026-09-26', isA: 'Journal' })
    content[journal.path] = '---\ntype: Journal\n---\n# Journal 2026-09-26\n\n- 09:00 coffee\n'
    const deps = makeDeps([journal])

    const result = await appendQuickCaptureToTodayJournal('ship the capture sheet', deps, now)

    expect(result).toEqual({ status: 'appended', entry: journal })
    expect(content[journal.path]).toBe('---\ntype: Journal\n---\n# Journal 2026-09-26\n\n- 09:00 coffee\n- 14:05 ship the capture sheet\n')
    expect(deps.updateTabContent).toHaveBeenCalledWith(journal.path, content[journal.path])
    expect(deps.flushBeforeWrite).not.toHaveBeenCalled()
    expect(deps.addEntry).not.toHaveBeenCalled()
    expect(deps.loadModifiedFiles).toHaveBeenCalled()
  })

  it('flushes pending editor edits before writing to an open journal', async () => {
    const journal = makeEntry({ path: '/vault/j.md', title: 'Journal 2026-09-26', isA: 'Journal' })
    content[journal.path] = '# Journal\n'
    const deps = makeDeps([journal], [journal.path])
    deps.flushBeforeWrite.mockImplementation(async () => { content[journal.path] = '# Journal\n\nunsaved typing\n' })

    await appendQuickCaptureToTodayJournal('later', deps, now)

    expect(deps.flushBeforeWrite).toHaveBeenCalledWith(journal.path)
    expect(content[journal.path]).toBe('# Journal\n\nunsaved typing\n\n- 14:05 later\n')
  })

  it("creates today's journal with the bullet when it is missing", async () => {
    const deps = makeDeps([makeEntry({ path: '/vault/other.md', title: 'Other', isA: 'Note' })])

    const result = await appendQuickCaptureToTodayJournal('first thought', deps, now)

    expect(result.status).toBe('created')
    if (result.status !== 'created') return
    expect(result.entry.title).toBe('Journal 2026-09-26')
    expect(result.entry.isA).toBe('Journal')
    expect(deps.addEntry).toHaveBeenCalledWith(result.entry)
    expect(addMockEntry).toHaveBeenCalledTimes(1)
    expect(content[result.entry.path]).toMatch(/\n\n- 14:05 first thought\n$/)
    expect(deps.addPendingSave).toHaveBeenCalledWith(result.entry.path)
    expect(deps.removePendingSave).toHaveBeenCalledWith(result.entry.path)
    expect(deps.updateTabContent).not.toHaveBeenCalled()
  })

  it('reports path collisions instead of overwriting', async () => {
    const clash = makeEntry({ path: '/vault/journal-2026-09-26.md', title: 'Something else', isA: 'Note' })
    const deps = makeDeps([clash])

    const result = await appendQuickCaptureToTodayJournal('x', deps, now)

    expect(result.status).toBe('blocked')
    expect(deps.addEntry).not.toHaveBeenCalled()
  })

  it('ignores blank captures', async () => {
    const deps = makeDeps([])
    await expect(appendQuickCaptureToTodayJournal('  \n ', deps, now)).resolves.toEqual({ status: 'empty' })
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})
