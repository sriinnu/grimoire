import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NoteItem } from './NoteItem'
import { makeEntry } from '../test-utils/noteListTestUtils'

vi.mock('../utils/url', async () => {
  const actual = await vi.importActual('../utils/url') as typeof import('../utils/url')
  return { ...actual, openExternalUrl: vi.fn().mockResolvedValue(undefined) }
})

const { openExternalUrl } = await import('../utils/url') as typeof import('../utils/url') & {
  openExternalUrl: ReturnType<typeof vi.fn>
}

describe('NoteItem relationship chips', () => {
  beforeEach(() => {
    openExternalUrl.mockClear()
  })

  it('colors relationship chips by target type and opens the related note on Cmd+click only', () => {
    const linkedProject = makeEntry({
      path: '/vault/project/build-app.md',
      filename: 'build-app.md',
      title: 'Build App',
      isA: 'Project',
    })
    const projectType = makeEntry({
      path: '/vault/type/project.md',
      filename: 'project.md',
      title: 'Project',
      isA: 'Type',
      color: 'red',
      icon: 'wrench',
    })
    const sourceEntry = makeEntry({
      path: '/vault/note/source.md',
      filename: 'source.md',
      title: 'Source',
      isA: 'Note',
      relationships: { 'Belongs to': ['[[project/build-app]]'] },
    })
    const onClickNote = vi.fn()

    render(
      <NoteItem
        entry={sourceEntry}
        isSelected={false}
        typeEntryMap={{ Project: projectType }}
        allEntries={[sourceEntry, linkedProject, projectType]}
        displayPropsOverride={['Belongs to']}
        onClickNote={onClickNote}
      />,
    )

    const chip = screen.getByTestId('property-chip-belongs-to-0')
    expect(chip).toHaveTextContent('Build App')
    expect(chip.className).toContain('cursor-pointer')
    expect(chip).toHaveStyle({ color: 'var(--accent-red)', backgroundColor: 'var(--accent-red-light)' })

    fireEvent.click(chip)
    expect(onClickNote).not.toHaveBeenCalled()

    fireEvent.click(chip, { metaKey: true })
    expect(onClickNote).toHaveBeenCalledWith(linkedProject, expect.objectContaining({ metaKey: true }))
  })

  it('falls back to the built-in type icon for relationship chips when the Type has no custom icon', () => {
    const linkedTopic = makeEntry({
      path: '/vault/topic/ai.md',
      filename: 'ai.md',
      title: 'AI',
      isA: 'topic',
    })
    const topicType = makeEntry({
      path: '/vault/type/topic.md',
      filename: 'topic.md',
      title: 'Topic',
      isA: 'Type',
      color: 'green',
      icon: null,
    })
    const sourceEntry = makeEntry({
      path: '/vault/note/source.md',
      filename: 'source.md',
      title: 'Source',
      isA: 'Note',
      relationships: { Topics: ['[[topic/ai]]'] },
    })

    render(
      <NoteItem
        entry={sourceEntry}
        isSelected={false}
        typeEntryMap={{ Topic: topicType, topic: topicType }}
        allEntries={[sourceEntry, linkedTopic, topicType]}
        displayPropsOverride={['Topics']}
        onClickNote={vi.fn()}
      />,
    )

    const chip = screen.getByTestId('property-chip-topics-0')
    expect(chip).toHaveTextContent('AI')
    expect(chip).toHaveStyle({ color: 'var(--accent-green)', backgroundColor: 'var(--accent-green-light)' })
    expect(chip.querySelector('svg')).not.toBeNull()
  })

  it('preserves exact linked note title formatting in relationship chips', () => {
    const linkedTopic = makeEntry({
      path: '/vault/topic/ai-ml.md',
      filename: 'ai-ml.md',
      title: 'AI / ML',
      isA: 'Topic',
    })
    const topicType = makeEntry({
      path: '/vault/type/topic.md',
      filename: 'topic.md',
      title: 'Topic',
      isA: 'Type',
      color: 'green',
    })
    const sourceEntry = makeEntry({
      path: '/vault/note/source.md',
      filename: 'source.md',
      title: 'Source',
      isA: 'Note',
      relationships: { Topics: ['[[topic/ai-ml]]'] },
    })

    render(
      <NoteItem
        entry={sourceEntry}
        isSelected={false}
        typeEntryMap={{ Topic: topicType }}
        allEntries={[sourceEntry, linkedTopic, topicType]}
        displayPropsOverride={['Topics']}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByTestId('property-chip-topics-0')).toHaveTextContent('AI / ML')
  })

  it('keeps explicit wikilink aliases in relationship chips', () => {
    const linkedProject = makeEntry({
      path: '/vault/project/my-project.md',
      filename: 'my-project.md',
      title: 'My Project',
      isA: 'Project',
    })
    const sourceEntry = makeEntry({
      path: '/vault/note/source.md',
      filename: 'source.md',
      title: 'Source',
      isA: 'Note',
      relationships: { 'Belongs to': ['[[project/my-project|My Cool Project]]'] },
    })

    render(
      <NoteItem
        entry={sourceEntry}
        isSelected={false}
        typeEntryMap={{}}
        allEntries={[sourceEntry, linkedProject]}
        displayPropsOverride={['Belongs to']}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByTestId('property-chip-belongs-to-0')).toHaveTextContent('My Cool Project')
  })

  it('opens URL chips on Cmd+click only and keeps regular clicks inert', () => {
    const entry = makeEntry({
      path: '/vault/note/source.md',
      filename: 'source.md',
      title: 'Source',
      properties: { URL: 'https://example.com/docs' },
    })
    const onClickNote = vi.fn()

    render(
      <NoteItem
        entry={entry}
        isSelected={false}
        typeEntryMap={{}}
        displayPropsOverride={['URL']}
        onClickNote={onClickNote}
      />,
    )

    const chip = screen.getByTestId('property-chip-url-0')
    expect(chip).toHaveTextContent('example.com')
    expect(chip.className).toContain('cursor-pointer')
    expect(chip).toHaveStyle({ color: 'var(--accent-blue)', backgroundColor: 'var(--accent-blue-light)' })

    fireEvent.click(chip)
    expect(openExternalUrl).not.toHaveBeenCalled()
    expect(onClickNote).not.toHaveBeenCalled()

    fireEvent.click(chip, { metaKey: true })
    expect(openExternalUrl).toHaveBeenCalledWith('https://example.com/docs')
    expect(onClickNote).not.toHaveBeenCalled()
  })

  it('renders broken relationship chips as neutral and non-interactive', () => {
    const entry = makeEntry({
      path: '/vault/note/source.md',
      filename: 'source.md',
      title: 'Source',
      relationships: { Related: ['[[missing/note]]'] },
    })
    const onClickNote = vi.fn()

    render(
      <NoteItem
        entry={entry}
        isSelected={false}
        typeEntryMap={{}}
        allEntries={[entry]}
        displayPropsOverride={['Related']}
        onClickNote={onClickNote}
      />,
    )

    const chip = screen.getByTestId('property-chip-related-0')
    expect(chip).toHaveTextContent('Note')
    expect(chip.className).not.toContain('cursor-pointer')

    fireEvent.click(chip, { metaKey: true })
    expect(onClickNote).not.toHaveBeenCalled()
    expect(openExternalUrl).not.toHaveBeenCalled()
  })
})
