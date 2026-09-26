import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installWritingFocus, WRITING_ATTRIBUTE } from './writingFocus'

describe('writing focus', () => {
  let cleanup: () => void
  let editor: HTMLElement
  let sidebar: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = `
      <aside class="app__sidebar"><button id="nav">Pages</button></aside>
      <div class="editor__blocknote-container"><div id="page" contenteditable="true"></div></div>
    `
    editor = document.getElementById('page')!
    sidebar = document.getElementById('nav')!
    cleanup = installWritingFocus(document)
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  const writing = () => document.documentElement.hasAttribute(WRITING_ATTRIBUTE)
  const key = (target: HTMLElement, init: KeyboardEventInit) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
  const move = (x: number, y: number) =>
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }) as PointerEvent)

  it('quiets the chrome when you type in the editor', () => {
    key(editor, { key: 'a' })
    expect(writing()).toBe(true)
  })

  it('ignores shortcuts and typing outside the editor', () => {
    key(editor, { key: 'k', metaKey: true })
    key(sidebar, { key: 'a' })
    expect(writing()).toBe(false)
  })

  it('comes back on deliberate mouse movement, not a bump', () => {
    key(editor, { key: 'a' })
    move(100, 100)
    move(104, 102)
    expect(writing()).toBe(true)
    move(130, 120)
    expect(writing()).toBe(false)
  })

  it('comes back on Escape and on clicks outside the page', () => {
    key(editor, { key: 'a' })
    key(editor, { key: 'Escape' })
    expect(writing()).toBe(false)

    key(editor, { key: 'Enter' })
    sidebar.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    expect(writing()).toBe(false)
  })

  it('removes itself cleanly', () => {
    key(editor, { key: 'a' })
    cleanup()
    expect(writing()).toBe(false)
    key(editor, { key: 'a' })
    expect(writing()).toBe(false)
    cleanup = () => {}
  })
})
