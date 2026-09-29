import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DraggableNoteItem } from './DraggableNoteItem'
import { NoteDropTarget } from './NoteDropTarget'
import { clearDraggedNotePath } from './noteDragData'

const NOTE_DRAG_MIME = 'application/x-grimoire-note-path'
const NOTE_PATH = '/vault/inbox/grimoire-social-media.md'

function createMockDataTransfer(options?: {
  readable?: boolean
  seedData?: Record<string, string>
}): DataTransfer {
  const data = new Map(Object.entries(options?.seedData ?? {}))
  const types = Array.from(data.keys())

  return {
    effectAllowed: 'move',
    dropEffect: 'none',
    setData(type: string, value: string) {
      data.set(type, value)
      if (!types.includes(type)) types.push(type)
    },
    getData(type: string) {
      if (options?.readable === false) return ''
      return data.get(type) ?? ''
    },
    clearData(type?: string) {
      if (type) {
        data.delete(type)
        const typeIndex = types.indexOf(type)
        if (typeIndex >= 0) types.splice(typeIndex, 1)
        return
      }
      data.clear()
      types.splice(0, types.length)
    },
    get types() {
      return types
    },
  } as DataTransfer
}

function serializedDragData(dataTransfer: DataTransfer) {
  return {
    [NOTE_DRAG_MIME]: dataTransfer.getData(NOTE_DRAG_MIME),
    'text/plain': dataTransfer.getData('text/plain'),
  }
}

describe('NoteDropTarget', () => {
  afterEach(async () => {
    clearDraggedNotePath()
    // DraggableNoteItem unmounts its drag-image root two frames after dragstart;
    // let that happen while jsdom is still alive, or react-dom throws after teardown.
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
  })

  it('keeps a note drag valid when dragover cannot read DataTransfer payloads', async () => {
    const onDropNote = vi.fn()
    const canAcceptNotePath = vi.fn((notePath: string) => notePath === NOTE_PATH)

    render(
      <>
        <DraggableNoteItem notePath={NOTE_PATH}>
          <span>Drag Grimoire Social media</span>
        </DraggableNoteItem>
        <NoteDropTarget canAcceptNotePath={canAcceptNotePath} onDropNote={onDropNote}>
          <span>CircleCI Series</span>
        </NoteDropTarget>
      </>,
    )

    const dragStartData = createMockDataTransfer()
    fireEvent.dragStart(screen.getByTestId(`draggable-note:${NOTE_PATH}`), { dataTransfer: dragStartData })

    const target = screen.getByText('CircleCI Series').parentElement
    expect(target).not.toBeNull()

    const lockedDragData = createMockDataTransfer({
      readable: false,
      seedData: serializedDragData(dragStartData),
    })

    fireEvent.dragEnter(target as HTMLElement, { dataTransfer: lockedDragData })
    fireEvent.dragOver(target as HTMLElement, { dataTransfer: lockedDragData })

    expect(canAcceptNotePath).toHaveBeenCalledWith(NOTE_PATH)
    expect(target).toHaveAttribute('data-drop-state', 'valid')

    const dropData = createMockDataTransfer({
      seedData: serializedDragData(dragStartData),
    })

    fireEvent.drop(target as HTMLElement, { dataTransfer: dropData })

    await waitFor(() => {
      expect(onDropNote).toHaveBeenCalledWith(NOTE_PATH)
    })
    expect(target).not.toHaveAttribute('data-drop-state')
  })
})
