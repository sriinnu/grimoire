import {
  ExtendButton,
  TableHandle,
  TableHandlesController,
  type ExtendButtonProps,
  type TableHandleProps,
} from '@blocknote/react'
import { Columns3, Plus, Rows3 } from 'lucide-react'

function GrimoireTableHandle(props: TableHandleProps) {
  const label = props.orientation === 'row' ? 'Row actions and drag handle' : 'Column actions and drag handle'
  return (
    <TableHandle {...props}>
      <span aria-label={label} className="grimoire-table-handle__icon" title={label}>
        <Rows3 size={15} strokeWidth={2} />
      </span>
    </TableHandle>
  )
}

function GrimoireTableExtendButton(props: ExtendButtonProps) {
  const addColumn = props.orientation === 'addOrRemoveColumns'
  const label = addColumn ? 'Add column' : 'Add row'
  return (
    <ExtendButton {...props}>
      <span aria-label={label} className="grimoire-table-add" title={label}>
        {addColumn ? <Columns3 size={14} strokeWidth={2} /> : <Rows3 size={14} strokeWidth={2} />}
        <Plus size={12} strokeWidth={2.5} />
        <span>{label}</span>
      </span>
    </ExtendButton>
  )
}

/** Replaces BlockNote's ambiguous dot grips with explicit table actions. */
export function GrimoireTableHandles() {
  return <TableHandlesController extendButton={GrimoireTableExtendButton} tableHandle={GrimoireTableHandle} />
}
