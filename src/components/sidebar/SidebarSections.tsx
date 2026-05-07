import {
  type Dispatch, type Ref, type RefObject, type SetStateAction,
} from 'react'
import type { VaultEntry, SidebarSelection, ViewFile } from '../../types'
import {
  DndContext, closestCenter, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SlidersHorizontal } from 'lucide-react'
import {
  CaretLeft, Plus,
} from '@phosphor-icons/react'
import grimoireIcon from '@/assets/app-icon.png'
import { Button } from '@/components/ui/button'
import {
  type SectionGroup, isSelectionActive, SectionContent, VisibilityPopover,
} from '../SidebarParts'
import { TypeCustomizePopover } from '../TypeCustomizePopover'
import { useDragRegion } from '../../hooks/useDragRegion'
import { NoteDropTarget } from '../note-retargeting/NoteDropTarget'
import { useNoteRetargetingContext } from '../note-retargeting/noteRetargetingContext'
import { SidebarGroupHeader } from './SidebarGroupHeader'
import { SidebarViewItem } from './SidebarViewItem'
import { countByFilter } from '../../utils/noteListHelpers'

export { SidebarTopNav } from './SidebarTopNav'
export { FavoritesSection } from './FavoritesSection'

export interface SidebarSectionProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  onContextMenu: (event: React.MouseEvent, type: string) => void
  renamingType: string | null
  renameInitialValue: string
  onRenameSubmit: (value: string) => void
  onRenameCancel: () => void
}

export function ViewsSection({
  views,
  selection,
  onSelect,
  collapsed,
  onToggle,
  onCreateView,
  onEditView,
  onDeleteView,
  entries,
}: {
  views: ViewFile[]
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  collapsed: boolean
  onToggle: () => void
  onCreateView?: () => void
  onEditView?: (filename: string) => void
  onDeleteView?: (filename: string) => void
  entries: VaultEntry[]
}) {
  return (
    <div className="border-b border-border" style={{ padding: '0 6px' }}>
      <SidebarGroupHeader label="VIEWS" collapsed={collapsed} onToggle={onToggle}>
        {onCreateView && (
          <Plus
            size={12}
            className="text-muted-foreground hover:text-foreground"
            onClick={(event) => { event.stopPropagation(); onCreateView() }}
          />
        )}
      </SidebarGroupHeader>
      {!collapsed && (
        <div style={{ paddingBottom: 4 }}>
          {views.map((view) => (
            <SidebarViewItem
              key={view.filename}
              view={view}
              isActive={isSelectionActive(selection, { kind: 'view', filename: view.filename })}
              onSelect={() => onSelect({ kind: 'view', filename: view.filename })}
              onEditView={onEditView}
              onDeleteView={onDeleteView}
              entries={entries}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SortableSection({
  group,
  sectionProps,
}: {
  group: SectionGroup
  sectionProps: SidebarSectionProps
}) {
  const noteRetargeting = useNoteRetargetingContext()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.type })
  const itemCount = countByFilter(sectionProps.entries, group.type).open
  const isRenaming = sectionProps.renamingType === group.type
  const content = (
    <SectionContent
      group={group}
      itemCount={itemCount}
      selection={sectionProps.selection}
      onSelect={sectionProps.onSelect}
      onContextMenu={sectionProps.onContextMenu}
      dragHandleProps={listeners}
      isRenaming={isRenaming}
      renameInitialValue={isRenaming ? sectionProps.renameInitialValue : undefined}
      onRenameSubmit={sectionProps.onRenameSubmit}
      onRenameCancel={sectionProps.onRenameCancel}
    />
  )

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        padding: '0 6px',
      }}
      {...attributes}
    >
      {noteRetargeting ? (
        <NoteDropTarget
          canAcceptNotePath={(notePath) => noteRetargeting.canDropNoteOnType(notePath, group.type)}
          onDropNote={(notePath) => noteRetargeting.dropNoteOnType(notePath, group.type)}
        >
          {content}
        </NoteDropTarget>
      ) : content}
    </div>
  )
}

export function TypesSection({
  visibleSections,
  allSectionGroups,
  sectionIds,
  sensors,
  handleDragEnd,
  sectionProps,
  collapsed,
  onToggle,
  showCustomize,
  setShowCustomize,
  isSectionVisible,
  toggleVisibility,
  onCreateNewType,
  customizeRef,
}: {
  visibleSections: SectionGroup[]
  allSectionGroups: SectionGroup[]
  sectionIds: string[]
  sensors: ReturnType<typeof useSensors>
  handleDragEnd: (event: DragEndEvent) => void
  sectionProps: SidebarSectionProps
  collapsed: boolean
  onToggle: () => void
  showCustomize: boolean
  setShowCustomize: Dispatch<SetStateAction<boolean>>
  isSectionVisible: (type: string) => boolean
  toggleVisibility: (type: string) => void
  onCreateNewType?: () => void
  customizeRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="border-b border-border">
      <div ref={customizeRef} style={{ position: 'relative', padding: '0 6px' }}>
        <SidebarGroupHeader label="LISTS" collapsed={collapsed} onToggle={onToggle}>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Customize sections"
              aria-label="Customize sections"
              className="h-auto w-auto min-w-0 rounded-none p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={(event) => { event.stopPropagation(); setShowCustomize((value) => !value) }}
            >
              <SlidersHorizontal size={12} className="text-muted-foreground hover:text-foreground" />
            </Button>
            {onCreateNewType && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="h-auto w-auto min-w-0 rounded-none p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                data-testid="create-type-btn"
                title="Create new type"
                aria-label="Create new type"
                onClick={(event) => { event.stopPropagation(); onCreateNewType() }}
              >
                <Plus size={12} className="text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>
        </SidebarGroupHeader>
        {showCustomize && (
          <VisibilityPopover
            sections={allSectionGroups}
            isSectionVisible={isSectionVisible}
            onToggle={toggleVisibility}
          />
        )}
      </div>
      {!collapsed && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {visibleSections.map((group) => (
              <SortableSection key={group.type} group={group} sectionProps={sectionProps} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

export function SidebarTitleBar({ onCollapse }: { onCollapse?: () => void }) {
  const { onMouseDown } = useDragRegion()

  return (
    <div
      className="sidebar-title-bar grid shrink-0 items-center border-b border-border"
      style={{
        height: 60,
        gridTemplateColumns: 'minmax(0, 1fr) 6px auto',
        padding: '0 8px 0 12px',
        cursor: 'default',
      }}
      onMouseDown={onMouseDown}
      data-testid="sidebar-title-bar"
    >
      <div
        className="sidebar-brand flex min-w-0 items-center justify-start gap-2.5"
        aria-label="Grimoire"
        data-testid="sidebar-brand"
      >
        <span className="sidebar-brand-mark grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-background shadow-xs">
          <img
            src={grimoireIcon}
            alt="Grimoire icon"
            className="h-7 w-7 rounded-md object-cover"
            data-testid="sidebar-brand-icon"
          />
        </span>
        <span className="flex min-w-0 flex-col leading-none" style={{ textAlign: 'left' }}>
          <span className="truncate text-[13px] font-semibold tracking-normal text-foreground" style={{ textAlign: 'left' }}>
            Grimoire
          </span>
          <span className="mt-1 truncate text-[10px] font-medium text-muted-foreground" style={{ textAlign: 'left' }}>
            Markdown agent
          </span>
        </span>
      </div>
      <span aria-hidden="true" />
      {onCollapse && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6 shrink-0 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <CaretLeft size={14} weight="bold" />
        </Button>
      )}
    </div>
  )
}

export function ContextMenuOverlay({
  pos,
  type,
  innerRef,
  onOpenCustomize,
  onStartRename,
}: {
  pos: { x: number; y: number } | null
  type: string | null
  innerRef: Ref<HTMLDivElement>
  onOpenCustomize: (type: string) => void
  onStartRename: (type: string) => void
}) {
  if (!pos || !type) return null

  const buttonClass = 'flex w-full items-center gap-2 rounded-sm border-none bg-transparent px-2 py-1.5 text-left text-sm cursor-default transition-colors hover:bg-accent hover:text-accent-foreground'

  return (
    <div
      ref={innerRef}
      className="fixed z-50 rounded-md border bg-popover p-1 shadow-md"
      style={{ left: pos.x, top: pos.y, minWidth: 180 }}
    >
      <button className={buttonClass} onClick={() => onStartRename(type)}>
        Rename section…
      </button>
      <button className={buttonClass} onClick={() => onOpenCustomize(type)}>
        Customize icon &amp; color…
      </button>
    </div>
  )
}

export function CustomizeOverlay({
  target,
  typeEntryMap,
  innerRef,
  onCustomize,
  onChangeTemplate,
  onClose,
}: {
  target: string | null
  typeEntryMap: Record<string, VaultEntry>
  innerRef: Ref<HTMLDivElement>
  onCustomize: (prop: 'icon' | 'color', value: string) => void
  onChangeTemplate: (template: string) => void
  onClose: () => void
}) {
  if (!target) return null

  return (
    <div ref={innerRef} className="fixed z-50" style={{ left: 20, top: 100 }}>
      <TypeCustomizePopover
        currentIcon={typeEntryMap[target]?.icon ?? null}
        currentColor={typeEntryMap[target]?.color ?? null}
        currentTemplate={typeEntryMap[target]?.template ?? null}
        onChangeIcon={(icon) => onCustomize('icon', icon)}
        onChangeColor={(color) => onCustomize('color', color)}
        onChangeTemplate={onChangeTemplate}
        onClose={onClose}
      />
    </div>
  )
}
