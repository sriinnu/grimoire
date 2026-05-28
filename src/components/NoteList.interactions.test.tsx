import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  allSelection,
  findNoteTitleElement,
  getNoteTitleElement,
  makeEntry,
  mockEntries,
  renderNoteList,
} from '../test-utils/noteListTestUtils'

describe('NoteList click behavior', () => {
  it('opens the current tab on a regular click', () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList()
    fireEvent.click(getNoteTitleElement('Build Grimoire App'))
    expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
    expect(onEnterNeighborhood).not.toHaveBeenCalled()
  })

  it('enters Neighborhood on Cmd+Click', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList()
    fireEvent.click(getNoteTitleElement('Build Grimoire App'), { metaKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
      expect(onEnterNeighborhood).toHaveBeenCalledWith(mockEntries[0])
    })
  })

  it('enters Neighborhood on Ctrl+Click', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList()
    fireEvent.click(getNoteTitleElement('Build Grimoire App'), { ctrlKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
      expect(onEnterNeighborhood).toHaveBeenCalledWith(mockEntries[0])
    })
  })

  it('supports Cmd+Click on the entity pinned card', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    fireEvent.click(await findNoteTitleElement('Build Grimoire App'), { metaKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
      expect(onEnterNeighborhood).toHaveBeenCalledWith(mockEntries[0])
    })
  })

  it('opens the current tab from the entity pinned card on regular click', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    fireEvent.click(await findNoteTitleElement('Build Grimoire App'))
    expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[0])
    expect(onEnterNeighborhood).not.toHaveBeenCalled()
  })

  it('opens child notes from entity view in the current tab', async () => {
    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    fireEvent.click(await screen.findByText('Facebook Ads Strategy'))
    expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[1])
    expect(onEnterNeighborhood).not.toHaveBeenCalled()
  })
})

describe('NoteList type sections', () => {
  const typeEntry = {
    ...makeEntry({
      path: '/Users/srinivas/Grimoire/types/project.md',
      filename: 'project.md',
      title: 'Project',
      isA: 'Type',
      snippet: 'Defines the Project type.',
      modifiedAt: 1700000000,
      fileSize: 200,
      wordCount: 50,
    }),
  }
  const entriesWithType = [...mockEntries, typeEntry]

  it('does not show a type note pinned card while browsing the section', () => {
    renderNoteList({
      entries: entriesWithType,
      selection: { kind: 'sectionGroup', type: 'Project' },
    })

    expect(screen.queryByText('Defines the Project type.')).not.toBeInTheDocument()
    expect(screen.getByText('Build Grimoire App')).toBeInTheDocument()
  })

  it('renders a clickable type header that opens the type note', () => {
    const { onReplaceActiveTab } = renderNoteList({
      entries: entriesWithType,
      selection: { kind: 'sectionGroup', type: 'Project' },
    })

    const headerLink = screen.getByTestId('type-header-link')
    expect(headerLink).toHaveTextContent('Project')
    fireEvent.click(headerLink)
    expect(onReplaceActiveTab).toHaveBeenCalledWith(typeEntry)
  })

  it('does not render a type header outside type sections', () => {
    renderNoteList({ entries: entriesWithType, selection: allSelection })
    expect(screen.queryByTestId('type-header-link')).not.toBeInTheDocument()
  })
})

describe('NoteList traffic-light padding', () => {
  it('adds left padding when the sidebar is collapsed', () => {
    const { container } = renderNoteList({ sidebarCollapsed: true })
    const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
    expect(header.style.paddingLeft).toBe('80px')
  })

  it('does not add extra left padding when the sidebar is expanded', () => {
    const { container } = renderNoteList({ sidebarCollapsed: false })
    const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
    expect(header.style.paddingLeft).toBe('')
  })

  it('defaults to no extra padding when sidebarCollapsed is omitted', () => {
    const { container } = renderNoteList()
    const header = container.querySelector('.h-\\[52px\\]') as HTMLElement
    expect(header.style.paddingLeft).toBe('')
  })
})
