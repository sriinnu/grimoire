import type { TagRecord } from '../../lib/bodyIndex/bodyIndexCore'

export interface TagTreeNode {
  tag: string
  /** Last path segment, what the row shows. */
  label: string
  count: number
  children: TagTreeNode[]
}

/** Turns flat 'a', 'a/b', 'a/b/c' records into a tree; every ancestor is already a record. */
export function buildTagTree(records: readonly TagRecord[]): TagTreeNode[] {
  const nodes = new Map<string, TagTreeNode>()
  const roots: TagTreeNode[] = []
  const sorted = [...records].sort((a, b) => a.tag.localeCompare(b.tag))
  for (const record of sorted) {
    const node: TagTreeNode = { tag: record.tag, label: record.tag.split('/').pop() ?? record.tag, count: record.count, children: [] }
    nodes.set(record.tag, node)
    const parentTag = record.tag.includes('/') ? record.tag.slice(0, record.tag.lastIndexOf('/')) : null
    const parent = parentTag ? nodes.get(parentTag) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
