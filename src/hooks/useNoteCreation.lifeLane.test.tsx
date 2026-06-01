import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { resolveNewNote, useNoteCreation, type NoteCreationConfig } from './useNoteCreation'

vi.mock('../lib/tauriRuntime', () => ({ invoke: vi.fn() }))
vi.mock('../mock-tauri', () => ({
  addMockEntry: vi.fn(),
  isTauri: vi.fn(() => false),
}))

function renderCreation(entries: VaultEntry[] = []) {
  const addEntry = vi.fn()
  const openTabWithContent = vi.fn()
  const config: NoteCreationConfig = {
    addEntry,
    removeEntry: vi.fn(),
    entries,
    setToastMessage: vi.fn(),
    vaultPath: '/vault',
  }

  const rendered = renderHook(() => useNoteCreation(config, { openTabWithContent }))
  return { ...rendered, addEntry, openTabWithContent }
}

describe('life lane note creation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 29, 9, 30, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it.each([
    ['Journal', '## Check-in'],
    ['Dream', '## Dream'],
  ])('stamps local date metadata for %s immediate creates', (typeName, templateHeading) => {
    const { result, addEntry, openTabWithContent } = renderCreation()

    act(() => {
      result.current.handleCreateNoteImmediate(typeName)
    })

    const [entry] = addEntry.mock.calls[0] as [VaultEntry]
    const [, content] = openTabWithContent.mock.calls[0] as [VaultEntry, string]
    expect(entry.properties).toMatchObject({
      date: '2026-05-29',
      locality: 'local',
      egress: 'blocked',
      created_from: 'lane-create',
      agent_context: 'blocked_private_lane',
      export_context: 'blocked_private_lane',
      sync_context: 'local_private_lane',
    })
    expect(content).toContain(`type: ${typeName}`)
    expect(content).toContain('date: 2026-05-29')
    expect(content).toContain('locality: local')
    expect(content).toContain('egress: blocked')
    expect(content).toContain('agent_context: blocked_private_lane')
    expect(content).toContain('export_context: blocked_private_lane')
    expect(content).toContain('sync_context: local_private_lane')
    expect(content).toContain(templateHeading)
  })

  it('does not stamp date metadata on generic typed immediate creates', () => {
    const { result, addEntry, openTabWithContent } = renderCreation()

    act(() => {
      result.current.handleCreateNoteImmediate('Project')
    })

    const [entry] = addEntry.mock.calls[0] as [VaultEntry]
    const [, content] = openTabWithContent.mock.calls[0] as [VaultEntry, string]
    expect(entry.properties.date).toBeUndefined()
    expect(content).not.toContain('date:')
    expect(content).not.toContain('agent_context:')
    expect(content).toContain('## Objective')
  })

  it.each(['Journal', 'Dream'])('stamps local date metadata for named %s creates', (typeName) => {
    const { entry, content } = resolveNewNote({
      title: `${typeName} Reflection`,
      type: typeName,
      vaultPath: '/vault',
    })

    expect(entry.properties).toMatchObject({
      date: '2026-05-29',
      locality: 'local',
      egress: 'blocked',
      created_from: 'named-create',
      agent_context: 'blocked_private_lane',
      export_context: 'blocked_private_lane',
      sync_context: 'local_private_lane',
    })
    expect(content).toContain(`type: ${typeName}`)
    expect(content).toContain('date: 2026-05-29')
    expect(content).toContain('created_from: named-create')
    expect(content).toContain('agent_context: blocked_private_lane')
    expect(content).toContain('export_context: blocked_private_lane')
    expect(content).toContain('sync_context: local_private_lane')
    expect(content).not.toContain('status:')
  })
})
