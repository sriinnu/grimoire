import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import mermaid from 'mermaid'
import { MarkdownContent } from './MarkdownContent'
import { preprocessWikilinks } from '../utils/chatWikilinks'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string, chart: string) => ({
      svg: `<svg data-testid="rendered-mermaid" data-id="${id}"><text>${chart}</text></svg>`,
    })),
  },
}))

describe('MarkdownContent', () => {
  it('renders bold text', () => {
    render(<MarkdownContent content="Hello **world**" />)
    const strong = screen.getByText('world')
    expect(strong.tagName).toBe('STRONG')
  })

  it('renders inline code', () => {
    render(<MarkdownContent content="Use `console.log`" />)
    const code = screen.getByText('console.log')
    expect(code.tagName).toBe('CODE')
  })

  it('renders fenced code blocks', () => {
    const { container } = render(<MarkdownContent content={'```js\nconst x = 1\n```'} />)
    const pre = container.querySelector('pre')
    expect(pre).toBeTruthy()
    expect(pre!.textContent).toContain('const x = 1')
  })

  it('auto-detects unlabeled fenced code languages', () => {
    const code = 'def greet(name):\n    return f"Hello {name}"'
    const { container } = render(<MarkdownContent content={`\`\`\`\n${code}\n\`\`\``} />)
    const codeBlock = container.querySelector('pre code')

    expect(codeBlock?.className).toContain('language-python')
  })

  it('renders markdown images including SVG attachments', () => {
    render(<MarkdownContent content="![Grimoire mark](attachments/logo.svg)" />)

    const image = screen.getByRole('img', { name: 'Grimoire mark' })
    expect(image).toHaveAttribute('src', 'attachments/logo.svg')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('renders mermaid fences as diagrams', async () => {
    render(<MarkdownContent content={'```mermaid\nsequenceDiagram\nA->>B: hi\n```'} />)

    expect(await screen.findByTestId('rendered-mermaid')).toBeInTheDocument()
    expect(screen.getByTestId('rendered-mermaid')).toHaveTextContent('sequenceDiagram')
  })

  it('renders classDiagram fences as Mermaid class diagrams', async () => {
    render(<MarkdownContent content={'```classDiagram\nclass Note {\n  +String title\n}\n```'} />)

    expect(await screen.findByTestId('rendered-mermaid')).toHaveTextContent('classDiagram')
    expect(screen.getByTestId('rendered-mermaid')).toHaveTextContent('+String title')
  })

  it('renders classDiagram-v2 fences as Mermaid class diagrams', async () => {
    render(<MarkdownContent content={'```classDiagram-v2\nNote --> Spelllink\n```'} />)

    expect(await screen.findByTestId('rendered-mermaid')).toHaveTextContent('classDiagram-v2')
    expect(screen.getByTestId('rendered-mermaid')).toHaveTextContent('Note --> Spelllink')
  })

  it('renders unlabeled fences that start with classDiagram as Mermaid', async () => {
    render(<MarkdownContent content={'```\nclassDiagram\nNote --> Spelllink\n```'} />)

    expect(await screen.findByTestId('rendered-mermaid')).toHaveTextContent('classDiagram')
  })

  it('keeps inline classDiagram text as inline code', () => {
    render(<MarkdownContent content="Use `classDiagram` inside a Mermaid fence." />)

    expect(screen.getByText('classDiagram').tagName).toBe('CODE')
  })

  it('falls back to Mermaid source when rendering fails', async () => {
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('bad diagram'))

    render(<MarkdownContent content={'```mermaid\nnot a diagram\n```'} />)

    expect(await screen.findByTestId('mermaid-diagram-error')).toHaveTextContent('not a diagram')
  })

  it('renders unordered lists', () => {
    const { container } = render(<MarkdownContent content={'- one\n- two\n- three'} />)
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toBe('one')
  })

  it('renders ordered lists', () => {
    const { container } = render(<MarkdownContent content={'1. first\n2. second'} />)
    const ol = container.querySelector('ol')
    expect(ol).toBeTruthy()
    expect(ol!.querySelectorAll('li')).toHaveLength(2)
  })

  it('renders headers', () => {
    render(<MarkdownContent content="## Section Title" />)
    const h2 = screen.getByText('Section Title')
    expect(h2.tagName).toBe('H2')
  })

  it('renders links', () => {
    render(<MarkdownContent content="[Click here](https://example.com)" />)
    const link = screen.getByText('Click here') as HTMLAnchorElement
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('https://example.com')
  })

  it('renders mixed markdown', () => {
    const { container } = render(<MarkdownContent content={'**Bold** and `code` and\n\n- item'} />)
    expect(screen.getByText('Bold').tagName).toBe('STRONG')
    expect(screen.getByText('code').tagName).toBe('CODE')
    expect(container.querySelector('li')).toBeTruthy()
  })

  it('wraps content in .ai-markdown container', () => {
    const { container } = render(<MarkdownContent content="Hello" />)
    expect(container.querySelector('.ai-markdown')).toBeTruthy()
  })

  it('renders plain text without crashing', () => {
    render(<MarkdownContent content="Just plain text" />)
    expect(screen.getByText('Just plain text')).toBeTruthy()
  })

  it('renders blockquotes', () => {
    const { container } = render(<MarkdownContent content="> A quote" />)
    const bq = container.querySelector('blockquote')
    expect(bq).toBeTruthy()
    expect(bq!.textContent).toContain('A quote')
  })

  describe('wikilinks', () => {
    it('preprocessWikilinks converts [[Target]] to markdown links', () => {
      expect(preprocessWikilinks('See [[My Note]]')).toBe('See [My Note](wikilink://My%20Note)')
      expect(preprocessWikilinks('[[A]] and [[B]]')).toBe('[A](wikilink://A) and [B](wikilink://B)')
      expect(preprocessWikilinks('`[[code]]`')).toBe('`[[code]]`')
    })

    it('renders [[Note Title]] as a clickable wikilink chip', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content="Check out [[My Note]]" onWikilinkClick={onClick} />,
      )
      const wikilink = container.querySelector('.chat-wikilink')
      expect(wikilink).toBeTruthy()
      expect(wikilink!.textContent).toBe('My Note')
      expect(wikilink!.getAttribute('data-wikilink-target')).toBe('My Note')
    })

    it('fires onWikilinkClick when a wikilink is clicked', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content="See [[Daily Log]]" onWikilinkClick={onClick} />,
      )
      const wikilink = container.querySelector('.chat-wikilink')!
      fireEvent.click(wikilink)
      expect(onClick).toHaveBeenCalledWith('Daily Log')
    })

    it('renders multiple wikilinks in the same paragraph', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content="See [[Note A]] and [[Note B]]" onWikilinkClick={onClick} />,
      )
      const wikilinks = container.querySelectorAll('.chat-wikilink')
      expect(wikilinks).toHaveLength(2)
      expect(wikilinks[0].textContent).toBe('Note A')
      expect(wikilinks[1].textContent).toBe('Note B')
    })

    it('handles pipe syntax [[target|display]]', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content="See [[path/to/note|My Display]]" onWikilinkClick={onClick} />,
      )
      const wikilink = container.querySelector('.chat-wikilink')!
      expect(wikilink.textContent).toBe('My Display')
      expect(wikilink.getAttribute('data-wikilink-target')).toBe('path/to/note')
      fireEvent.click(wikilink)
      expect(onClick).toHaveBeenCalledWith('path/to/note')
    })

    it('does not render wikilinks inside inline code', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content="Use `[[Not a link]]` syntax" onWikilinkClick={onClick} />,
      )
      expect(container.querySelector('.chat-wikilink')).toBeNull()
    })

    it('does not render wikilinks inside code blocks', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content={'```\n[[Not a link]]\n```'} onWikilinkClick={onClick} />,
      )
      expect(container.querySelector('.chat-wikilink')).toBeNull()
    })

    it('handles notes with special characters in title', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content="Check [[Meeting — 2024/01/15]]" onWikilinkClick={onClick} />,
      )
      const wikilink = container.querySelector('.chat-wikilink')!
      expect(wikilink.textContent).toBe('Meeting — 2024/01/15')
      fireEvent.click(wikilink)
      expect(onClick).toHaveBeenCalledWith('Meeting — 2024/01/15')
    })

    it('does not transform wikilinks when onWikilinkClick is not provided', () => {
      const { container } = render(
        <MarkdownContent content="See [[Some Note]]" />,
      )
      expect(container.querySelector('.chat-wikilink')).toBeNull()
      expect(container.textContent).toContain('[[Some Note]]')
    })

    it('renders wikilinks inside list items', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content={'- First [[Note A]]\n- Second [[Note B]]'} onWikilinkClick={onClick} />,
      )
      const wikilinks = container.querySelectorAll('.chat-wikilink')
      expect(wikilinks).toHaveLength(2)
    })

    it('has role="link" and tabIndex for accessibility', () => {
      const onClick = vi.fn()
      const { container } = render(
        <MarkdownContent content="See [[Accessible Note]]" onWikilinkClick={onClick} />,
      )
      const wikilink = container.querySelector('.chat-wikilink')!
      expect(wikilink.getAttribute('role')).toBe('link')
      expect(wikilink.getAttribute('tabindex')).toBe('0')
    })
  })
})
