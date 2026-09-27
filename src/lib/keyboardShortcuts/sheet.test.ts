import { describe, expect, it } from 'vitest'
import { chordsForAppShortcut, formatChordCaps, parseKeymap } from './chords'
import { allShortcutEntries } from './registry'
import { filterShortcutGroups, groupShortcutEntries } from './sheet'

describe('chords', () => {
  it('parses keymaps regardless of modifier order', () => {
    expect(parseKeymap('Shift-Mod-z')).toEqual({ modifiers: ['shift', 'mod'], key: 'z' })
    expect(parseKeymap('Mod-Alt-1')).toEqual({ modifiers: ['mod', 'alt'], key: '1' })
    expect(parseKeymap('Mod--')).toEqual({ modifiers: ['mod'], key: '-' })
    expect(() => parseKeymap('Hyper-x')).toThrow()
  })

  it('renders platform-aware caps', () => {
    const chord = parseKeymap('Shift-Mod-ArrowUp')
    expect(formatChordCaps(chord, 'mac')).toEqual(['⌘', '⇧', '↑'])
    expect(formatChordCaps(chord, 'other')).toEqual(['Ctrl', 'Shift', 'Up'])
    expect(formatChordCaps(parseKeymap('Mod-Alt-q'), 'mac')).toEqual(['⌘', '⌥', 'Q'])
    expect(formatChordCaps(parseKeymap('Mod-Alt-q'), 'other')).toEqual(['Ctrl', 'Alt', 'Q'])
    expect(formatChordCaps({ modifiers: ['mod', 'ctrl'], key: 'Space' }, 'mac')).toEqual(['⌘', '⌃', 'Space'])
    expect(formatChordCaps({ modifiers: ['mod', 'ctrl'], key: 'Space' }, 'other')).toEqual(['Ctrl', 'Space'])
  })

  it('only shows aliases the display string advertises', () => {
    expect(chordsForAppShortcut({ combo: 'command-or-ctrl', key: 'p', aliases: ['o'], display: '⌘P / ⌘O' })).toHaveLength(2)
    expect(chordsForAppShortcut({ combo: 'command-or-ctrl', key: '=', aliases: ['+'], display: '⌘=' })).toHaveLength(1)
  })
})

describe('shortcut sheet grouping', () => {
  const groups = groupShortcutEntries(allShortcutEntries(), 'mac')

  it('uses the four columns in order', () => {
    expect(groups.map((group) => group.label)).toEqual(['Navigate', 'Notes', 'Writing', 'View'])
  })

  it('keeps writing shortcuts in their own group', () => {
    const writing = groups.find((group) => group.id === 'writing')
    expect(writing?.rows.map((row) => row.entry.label)).toEqual(expect.arrayContaining(['Bold', 'Italic', 'Heading 1', 'Insert block (slash menu)']))
    expect(groups.filter((group) => group.id !== 'writing').flatMap((group) => group.rows).some((row) => row.entry.id.startsWith('writing-'))).toBe(false)
  })

  it('lists the sheet itself under View', () => {
    const view = groups.find((group) => group.id === 'view')
    const row = view?.rows.find((candidate) => candidate.entry.label === 'Keyboard shortcuts')
    expect(row?.caps).toEqual([['⌘', '/']])
  })
})

describe('filterShortcutGroups', () => {
  const groups = groupShortcutEntries(allShortcutEntries(), 'other')

  it('returns everything for a blank query', () => {
    expect(filterShortcutGroups(groups, '   ')).toEqual(groups)
  })

  it('matches labels, keywords and group names case-insensitively', () => {
    const [bold] = filterShortcutGroups(groups, 'BOLD')
    expect(bold.id).toBe('writing')
    expect(bold.rows.map((row) => row.entry.label)).toEqual(['Bold'])
    expect(filterShortcutGroups(groups, 'todo')[0].rows[0].entry.label).toBe('Checklist')
    expect(filterShortcutGroups(groups, 'navigate').map((group) => group.id)).toEqual(['navigate'])
  })

  it('matches key caps as typed', () => {
    const labels = filterShortcutGroups(groups, 'ctrl+shift+f').flatMap((group) => group.rows.map((row) => row.entry.label))
    expect(labels).toEqual(['Search the notebook'])
  })

  it('drops groups with no matches', () => {
    expect(filterShortcutGroups(groups, 'zzz-no-such-shortcut')).toEqual([])
  })
})
