import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { publishTagSnapshot, resetTagSnapshotForTests } from '../../lib/bodyIndex/tagSnapshot'
import { TagsSection } from './TagsSection'
import { buildTagTree } from './tagTree'

afterEach(() => resetTagSnapshotForTests())

function publish(tags: Array<[string, string[]]>) {
  publishTagSnapshot({
    version: 1,
    tags: tags.map(([tag, paths]) => ({ tag, count: paths.length, paths })),
  })
}

describe('buildTagTree', () => {
  it('nests a/b under a and keeps siblings sorted', () => {
    const tree = buildTagTree([
      { tag: 'home/kitchen', count: 1, paths: ['/k.md'] },
      { tag: 'home', count: 2, paths: ['/k.md', '/g.md'] },
      { tag: 'home/garden', count: 1, paths: ['/g.md'] },
      { tag: 'alpha', count: 3, paths: [] },
    ])
    expect(tree.map((node) => node.tag)).toEqual(['alpha', 'home'])
    expect(tree[1].children.map((node) => node.label)).toEqual(['garden', 'kitchen'])
    expect(tree[1].count).toBe(2)
  })
})

describe('TagsSection', () => {
  it('renders nothing while the vault has no tags', () => {
    const { container } = render(
      <TagsSection selection={{ kind: 'dashboard' }} onSelect={vi.fn()} collapsed={false} onToggle={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists tags with counts as a tree and selects a tag on click', () => {
    publish([
      ['home', ['/k.md', '/g.md']],
      ['home/garden', ['/g.md']],
      ['plants', ['/g.md']],
    ])
    const onSelect = vi.fn()
    render(<TagsSection selection={{ kind: 'dashboard' }} onSelect={onSelect} collapsed={false} onToggle={vi.fn()} />)

    const section = screen.getByTestId('sidebar-tags')
    expect(within(section).getByText('Tags')).toBeInTheDocument()
    const home = screen.getByTestId('tag-row:home')
    expect(home).toHaveTextContent('home')
    expect(home).toHaveTextContent('2')
    expect(screen.getByTestId('tag-row:home/garden')).toHaveTextContent('garden')

    fireEvent.click(within(screen.getByTestId('tag-row:plants')).getByText('plants'))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'tag', tag: 'plants' })
  })

  it('marks the active tag and collapses a parent', () => {
    publish([['home', ['/g.md']], ['home/garden', ['/g.md']]])
    render(<TagsSection selection={{ kind: 'tag', tag: 'home/garden' }} onSelect={vi.fn()} collapsed={false} onToggle={vi.fn()} />)
    expect(screen.getByTestId('tag-row:home/garden')).toHaveAttribute('data-selected', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Collapse home' }))
    expect(screen.queryByTestId('tag-row:home/garden')).not.toBeInTheDocument()
  })

  it('hides the rows when the group is collapsed but keeps the header', () => {
    publish([['alpha', ['/a.md']]])
    const onToggle = vi.fn()
    render(<TagsSection selection={{ kind: 'dashboard' }} onSelect={vi.fn()} collapsed={true} onToggle={onToggle} />)
    expect(screen.queryByTestId('tag-row:alpha')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Tags'))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
