import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../../types'
import {
  buildDashboardCalendarMatrix,
  dashboardCalendarDateKey,
  dashboardCalendarLaneForEntry,
  dashboardCalendarMonthLabel,
  dashboardCalendarShiftMonth,
} from './DashboardCalendarModel'

function entry(title: string, type: string, dateKey: string): VaultEntry {
  const [year, month, day] = dateKey.split('-').map(Number)
  const ts = Math.floor(new Date(year, month - 1, day, 9, 0, 0).getTime() / 1000)
  return {
    path: `/vault/${title}.md`,
    filename: `${title}.md`,
    title,
    isA: type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: ts,
    createdAt: ts,
    fileSize: 0,
    snippet: '',
    wordCount: 5,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
  }
}

describe('DashboardCalendarModel', () => {
  const may2026 = new Date(2026, 4, 1)

  it('builds a fixed six-week by seven-day matrix anchored on Sunday', () => {
    const matrix = buildDashboardCalendarMatrix(may2026, [], new Date(2026, 4, 15))
    expect(matrix).toHaveLength(6)
    for (const week of matrix) expect(week).toHaveLength(7)
    // May 1 2026 is a Friday, so the grid starts on the preceding Sunday Apr 26.
    expect(matrix[0][0].dateKey).toBe('2026-04-26')
    expect(matrix[0][0].outsideMonth).toBe(true)
    expect(matrix[0][0].date.getDay()).toBe(0)
    // Last visible cell is six weeks later, day 41.
    expect(matrix[5][6].dateKey).toBe('2026-06-06')
  })

  it('flags the in-month days and today', () => {
    const matrix = buildDashboardCalendarMatrix(may2026, [], new Date(2026, 4, 15))
    const flat = matrix.flat()
    const inMonth = flat.filter((day) => !day.outsideMonth)
    expect(inMonth).toHaveLength(31)
    expect(inMonth[0].dayNumber).toBe(1)
    const todayCell = flat.find((day) => day.today)
    expect(todayCell?.dateKey).toBe('2026-05-15')
    expect(todayCell?.outsideMonth).toBe(false)
  })

  it('maps entries to their day by lane via modifiedAt/createdAt', () => {
    const entries = [
      entry('morning', 'Journal', '2026-05-15'),
      entry('evening', 'Journal', '2026-05-15'),
      entry('river', 'Dream', '2026-05-15'),
      entry('task', 'Task', '2026-05-15'),
      entry('elsewhere', 'Journal', '2026-05-02'),
    ]
    const matrix = buildDashboardCalendarMatrix(may2026, entries, new Date(2026, 4, 15))
    const flat = matrix.flat()
    const day15 = flat.find((day) => day.dateKey === '2026-05-15')!
    expect(day15.total).toBe(4)
    expect(day15.markers).toEqual([
      { lane: 'journal', count: 2 },
      { lane: 'dream', count: 1 },
      { lane: 'other', count: 1 },
    ])
    const day2 = flat.find((day) => day.dateKey === '2026-05-02')!
    expect(day2.markers).toEqual([{ lane: 'journal', count: 1 }])
    const day3 = flat.find((day) => day.dateKey === '2026-05-03')!
    expect(day3.markers).toEqual([])
    expect(day3.total).toBe(0)
  })

  it('ignores archived and non-markdown entries', () => {
    const archived = { ...entry('old', 'Journal', '2026-05-10'), archived: true }
    const asset = { ...entry('pic', 'Note', '2026-05-10'), fileKind: 'image' as VaultEntry['fileKind'] }
    const matrix = buildDashboardCalendarMatrix(may2026, [archived, asset], new Date(2026, 4, 15))
    const day10 = matrix.flat().find((day) => day.dateKey === '2026-05-10')!
    expect(day10.markers).toEqual([])
  })

  it('classifies lanes case-insensitively with everything else as other', () => {
    expect(dashboardCalendarLaneForEntry(entry('a', 'journal', '2026-05-01'))).toBe('journal')
    expect(dashboardCalendarLaneForEntry(entry('b', 'DREAM', '2026-05-01'))).toBe('dream')
    expect(dashboardCalendarLaneForEntry(entry('c', 'Project', '2026-05-01'))).toBe('other')
  })

  it('shifts months and labels them', () => {
    expect(dashboardCalendarMonthLabel(may2026)).toBe('May 2026')
    expect(dashboardCalendarShiftMonth(may2026, 1).getMonth()).toBe(5)
    expect(dashboardCalendarShiftMonth(may2026, -5).getFullYear()).toBe(2025)
    expect(dashboardCalendarShiftMonth(may2026, -5).getMonth()).toBe(11)
  })

  it('keys dates without UTC drift', () => {
    expect(dashboardCalendarDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
