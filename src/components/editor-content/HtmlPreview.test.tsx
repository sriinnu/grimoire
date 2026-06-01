import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HtmlPreview } from './HtmlPreview'

describe('HtmlPreview', () => {
  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute('style')
  })

  it('renders html source through a sandboxed iframe', () => {
    render(<HtmlPreview content="<h1>Hello</h1>" title="page.html" />)

    const preview = screen.getByTestId('html-preview')
    expect(preview).toHaveAttribute('sandbox', '')
    expect(preview).toHaveAttribute('title', 'HTML preview: page.html')
    expect(preview).toHaveAttribute('srcdoc', expect.stringContaining('<h1>Hello</h1>'))
  })

  it('passes resolved app theme tokens into the iframe document', () => {
    document.documentElement.style.setProperty('--surface-card', '#101820')
    document.documentElement.style.setProperty('--border-default', '#24465a')
    document.documentElement.style.setProperty('--text-primary', '#f7fbff')
    document.documentElement.style.setProperty('--grimoire-editor-font-family', 'ui-serif, Georgia, serif')
    document.documentElement.style.setProperty('--primary', '#8be1ff')
    document.documentElement.style.setProperty('--text-secondary', '#a6b7c2')

    render(<HtmlPreview content="<table><tr><td>Cell</td></tr></table>" title="page.html" />)

    const preview = screen.getByTestId('html-preview')
    expect(preview).toHaveClass('html-preview-frame')
    expect(preview.className).not.toContain('bg-white')
    expect(preview).toHaveAttribute('srcdoc', expect.stringContaining('--html-preview-bg:#101820'))
    expect(preview).toHaveAttribute('srcdoc', expect.stringContaining('td,th{border:1px solid var(--html-preview-border)'))
  })
})
