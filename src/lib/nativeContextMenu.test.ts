import { afterEach, describe, expect, it } from 'vitest'
import { installAppContextMenuGuard } from './nativeContextMenu'

let cleanup: (() => void) | null = null

afterEach(() => {
  cleanup?.()
  cleanup = null
})

describe('installAppContextMenuGuard', () => {
  it('prevents the host menu after app menu propagation', () => {
    const bubbleDefaultStates: boolean[] = []
    document.body.addEventListener('contextmenu', (event) => {
      bubbleDefaultStates.push(event.defaultPrevented)
    }, { once: true })

    cleanup = installAppContextMenuGuard(document)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    document.body.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(bubbleDefaultStates).toEqual([false])
  })

  it('lets Radix-style trigger handlers inspect a clean context-menu event', () => {
    const trigger = document.createElement('button')
    const triggerDefaultStates: boolean[] = []
    trigger.addEventListener('contextmenu', (event) => {
      triggerDefaultStates.push(event.defaultPrevented)
    }, { once: true })
    document.body.appendChild(trigger)

    cleanup = installAppContextMenuGuard(document)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    trigger.dispatchEvent(event)
    trigger.remove()

    expect(triggerDefaultStates).toEqual([false])
    expect(event.defaultPrevented).toBe(true)
  })

  it.each([
    ['input', () => document.createElement('input')],
    ['textarea', () => document.createElement('textarea')],
    ['contenteditable', () => {
      const element = document.createElement('div')
      element.contentEditable = 'true'
      element.setAttribute('contenteditable', 'true')
      return element
    }],
    ['link', () => {
      const element = document.createElement('a')
      element.href = 'https://example.com'
      return element
    }],
    ['image', () => document.createElement('img')],
  ])('preserves the native menu for %s surfaces', (_, createElement) => {
    const trigger = createElement()
    document.body.appendChild(trigger)

    cleanup = installAppContextMenuGuard(document)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    trigger.dispatchEvent(event)
    trigger.remove()

    expect(event.defaultPrevented).toBe(false)
  })

  it('preserves the native menu for selected readable text', () => {
    const text = document.createElement('p')
    text.textContent = 'Selected passage'
    document.body.appendChild(text)
    const range = document.createRange()
    range.selectNodeContents(text)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    cleanup = installAppContextMenuGuard(document)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    text.dispatchEvent(event)
    selection?.removeAllRanges()
    text.remove()

    expect(event.defaultPrevented).toBe(false)
  })

  it('removes the guard cleanly for isolated tests', () => {
    cleanup = installAppContextMenuGuard(document)
    cleanup()
    cleanup = null

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

    document.body.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
