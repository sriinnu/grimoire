import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HtmlPreview } from './HtmlPreview'

describe('HtmlPreview', () => {
  it('renders html source through a sandboxed iframe', () => {
    render(<HtmlPreview content="<h1>Hello</h1>" title="page.html" />)

    const preview = screen.getByTestId('html-preview')
    expect(preview).toHaveAttribute('sandbox', '')
    expect(preview).toHaveAttribute('title', 'HTML preview: page.html')
    expect(preview).toHaveAttribute('srcdoc', expect.stringContaining('<h1>Hello</h1>'))
  })
})
