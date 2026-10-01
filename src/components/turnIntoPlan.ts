/**
 * Which blocks change when one block is "turned into" another type.
 *
 * A list is a unit. Turning one item of a numbered list into a bullet turns
 * the whole contiguous list (the run of siblings of the same list type around
 * it) and any nested sub-lists of that same type. Turning a list item into a
 * paragraph, heading, quote or code block only changes that one item, because
 * a heading per line is never what anyone meant. Everything else is one block.
 */

import type { PartialBlock } from '@blocknote/core'

export const LIST_BLOCK_TYPES = new Set(['bulletListItem', 'numberedListItem', 'checkListItem'])

export type PlanBlock = {
  id: string
  type: string
  props?: Record<string, unknown>
  children?: PlanBlock[]
}

/** The two sibling lookups the planner needs; BlockNote's editor satisfies it. */
export interface BlockNeighbors {
  getPrevBlock?: (id: string) => PlanBlock | undefined
  getNextBlock?: (id: string) => PlanBlock | undefined
}

export function isListConversion(sourceType: string, targetType: string): boolean {
  return LIST_BLOCK_TYPES.has(sourceType) && LIST_BLOCK_TYPES.has(targetType) && sourceType !== targetType
}

function sameKindDescendants(block: PlanBlock, type: string, out: PlanBlock[]): void {
  for (const child of block.children ?? []) {
    if (child.type === type) {
      out.push(child)
      sameKindDescendants(child, type, out)
    }
  }
}

/** The contiguous run of siblings sharing `block.type`, in document order, with same-kind descendants. */
export function listRunAround(block: PlanBlock, editor: BlockNeighbors): PlanBlock[] {
  const before: PlanBlock[] = []
  let cursor: PlanBlock | undefined = editor.getPrevBlock?.(block.id)
  while (cursor && cursor.type === block.type) {
    before.unshift(cursor)
    cursor = editor.getPrevBlock?.(cursor.id)
  }
  const after: PlanBlock[] = []
  cursor = editor.getNextBlock?.(block.id)
  while (cursor && cursor.type === block.type) {
    after.push(cursor)
    cursor = editor.getNextBlock?.(cursor.id)
  }
  const run = [...before, block, ...after]
  const all: PlanBlock[] = []
  for (const item of run) {
    all.push(item)
    sameKindDescendants(item, block.type, all)
  }
  return all
}

/** Blocks to update for this conversion, the focused block always included. */
export function turnIntoTargets(block: PlanBlock, targetType: string, editor: BlockNeighbors): PlanBlock[] {
  if (isListConversion(block.type, targetType)) return listRunAround(block, editor)
  return [block]
}

/** The slice of the editor a conversion needs; kept loose so tests can stub it. */
export type TurnIntoEditor = BlockNeighbors & {
  updateBlock: (block: unknown, update: PartialBlock) => unknown
  transact?: (fn: () => void) => void
}

type FocusedBlock = { id?: string; type: string; props?: Record<string, unknown>; children?: unknown[] }

/**
 * Applies one turn-into choice. A list is converted as a unit; everything else
 * changes just the focused block. All updates land in one transaction so a
 * single undo reverts the whole conversion.
 */
export function applyTurnInto(editor: TurnIntoEditor, block: FocusedBlock, update: PartialBlock): void {
  const targetType = typeof update.type === 'string' ? update.type : ''
  const planBlock: PlanBlock = { id: block.id ?? '', type: block.type, props: block.props, children: block.children as PlanBlock[] | undefined }
  const targets = block.id ? turnIntoTargets(planBlock, targetType, editor) : [planBlock]
  const run = () => {
    for (const target of targets) editor.updateBlock(target === planBlock ? block : target, update)
  }
  if (editor.transact) editor.transact(run)
  else run()
}
