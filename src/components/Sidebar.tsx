import { useCallback, memo } from 'react'
import type { VaultEntry, FolderNode, SidebarSelection, ViewFile } from '../types'
import { FolderTree } from './FolderTree'
import {
  useEntryCounts,
  usePrimaryLaneCounts,
  useSidebarCollapsed,
  useSidebarSections,
} from './sidebar/sidebarHooks'
import {
  ContextMenuOverlay,
  CustomizeOverlay,
  FavoritesSection,
  type SidebarSectionProps,
  SidebarTitleBar,
  SidebarTopNav,
  TypesSection,
  ViewsSection,
} from './sidebar/SidebarSections'
import { SidebarArtwork } from './sidebar/SidebarArtwork'
import { SidebarRail } from './sidebar/SidebarRail'
import { useSidebarTypeInteractions } from './sidebar/useSidebarTypeInteractions'

interface SidebarProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  onSelectNote?: (entry: VaultEntry) => void
  onCreateType?: (type: string) => void
  onCreateNewType?: () => void
  onCustomizeType?: (typeName: string, icon: string, color: string) => void
  onUpdateTypeTemplate?: (typeName: string, template: string) => void
  onReorderSections?: (orderedTypes: { typeName: string; order: number }[]) => void
  onRenameSection?: (typeName: string, label: string) => void
  onToggleTypeVisibility?: (typeName: string) => void
  onSelectFavorite?: (entry: VaultEntry) => void
  onReorderFavorites?: (orderedPaths: string[]) => void
  views?: ViewFile[]
  onCreateView?: () => void
  onEditView?: (filename: string) => void
  onDeleteView?: (filename: string) => void
  folders?: FolderNode[]
  onCreateFolder?: (name: string) => Promise<boolean> | boolean
  onRenameFolder?: (folderPath: string, nextName: string) => Promise<boolean> | boolean
  onDeleteFolder?: (folderPath: string) => void
  renamingFolderPath?: string | null
  onStartRenameFolder?: (folderPath: string) => void
  onCancelRenameFolder?: () => void
  showInbox?: boolean
  inboxCount?: number
  collapsed?: boolean
  onCollapse?: () => void
  onExpand?: () => void
}

export const Sidebar = memo(function Sidebar({
  entries,
  selection,
  onSelect,
  onCustomizeType,
  onUpdateTypeTemplate,
  onReorderSections,
  onRenameSection,
  onToggleTypeVisibility,
  onSelectFavorite,
  onReorderFavorites,
  views = [],
  onCreateView,
  onEditView,
  onDeleteView,
  folders = [],
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  renamingFolderPath,
  onStartRenameFolder,
  onCancelRenameFolder,
  showInbox = true,
  inboxCount = 0,
  collapsed = false,
  onCollapse,
  onExpand,
  onCreateNewType,
}: SidebarProps) {
  const { typeEntryMap, allSectionGroups, visibleSections, sectionIds } = useSidebarSections(entries)
  const { activeCount, archivedCount } = useEntryCounts(entries)
  const { noteCount, journalCount, dreamCount } = usePrimaryLaneCounts(entries)
  const { collapsed: groupCollapsed, toggle: toggleGroup } = useSidebarCollapsed()
  const typeInteractions = useSidebarTypeInteractions({
    allSectionGroups,
    typeEntryMap,
    onCustomizeType,
    onUpdateTypeTemplate,
    onRenameSection,
  })

  const isSectionVisible = useCallback((type: string) => typeEntryMap[type]?.visible !== false, [typeEntryMap])
  const toggleVisibility = useCallback((type: string) => onToggleTypeVisibility?.(type), [onToggleTypeVisibility])

  const sectionProps: SidebarSectionProps = {
    entries,
    selection,
    onSelect,
    onContextMenu: typeInteractions.handleContextMenu,
    renamingType: typeInteractions.renamingType,
    renameInitialValue: typeInteractions.renameInitialValue,
    onRenameSubmit: typeInteractions.handleRenameSubmit,
    onRenameCancel: typeInteractions.cancelRename,
  }

  const hasFavorites = entries.some((entry) => entry.favorite && !entry.archived)
  const hasViews = views.length > 0 || !!onCreateView

  if (collapsed) {
    return (
      <SidebarRail
        selection={selection}
        onSelect={onSelect}
        onExpand={onExpand}
        showInbox={showInbox}
        inboxCount={inboxCount}
        activeCount={activeCount}
        noteCount={noteCount}
        journalCount={journalCount}
        dreamCount={dreamCount}
        archivedCount={archivedCount}
      />
    )
  }

  return (
    <aside className="app-sidebar-panel flex h-full flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-sidebar text-sidebar-foreground">
      <SidebarTitleBar onCollapse={onCollapse} />
      <nav className="app-sidebar-nav flex-1 overflow-y-auto">
        <SidebarTopNav
          selection={selection}
          onSelect={onSelect}
          showInbox={showInbox}
          inboxCount={inboxCount}
          activeCount={activeCount}
          noteCount={noteCount}
          journalCount={journalCount}
          dreamCount={dreamCount}
          archivedCount={archivedCount}
        />
        {hasFavorites && (
          <div className="border-b border-border">
            <FavoritesSection
              entries={entries}
              selection={selection}
              onSelect={onSelect}
              onSelectNote={onSelectFavorite}
              onReorder={onReorderFavorites}
              collapsed={groupCollapsed.favorites}
              onToggle={() => toggleGroup('favorites')}
            />
          </div>
        )}
        {hasViews && (
          <ViewsSection
            views={views}
            selection={selection}
            onSelect={onSelect}
            collapsed={groupCollapsed.views}
            onToggle={() => toggleGroup('views')}
            onCreateView={onCreateView}
            onEditView={onEditView}
            onDeleteView={onDeleteView}
            entries={entries}
          />
        )}
        <TypesSection
          visibleSections={visibleSections}
          allSectionGroups={allSectionGroups}
          sectionIds={sectionIds}
          onReorderSections={onReorderSections}
          sectionProps={sectionProps}
          collapsed={groupCollapsed.sections}
          onToggle={() => toggleGroup('sections')}
          showCustomize={typeInteractions.showCustomize}
          setShowCustomize={typeInteractions.setShowCustomize}
          isSectionVisible={isSectionVisible}
          toggleVisibility={toggleVisibility}
          onCreateNewType={onCreateNewType}
          customizeRef={typeInteractions.customizeRef}
        />
        <FolderTree
          folders={folders}
          selection={selection}
          onSelect={onSelect}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          renamingFolderPath={renamingFolderPath}
          onStartRenameFolder={onStartRenameFolder}
          onCancelRenameFolder={onCancelRenameFolder}
          collapsed={groupCollapsed.folders}
          onToggle={() => toggleGroup('folders')}
        />
      </nav>
      <SidebarArtwork />
      <ContextMenuOverlay
        pos={typeInteractions.contextMenuPos}
        type={typeInteractions.contextMenuType}
        innerRef={typeInteractions.contextMenuRef}
        onOpenCustomize={typeInteractions.openCustomizeTarget}
        onStartRename={typeInteractions.handleStartRename}
      />
      <CustomizeOverlay
        target={typeInteractions.customizeTarget}
        typeEntryMap={typeEntryMap}
        innerRef={typeInteractions.popoverRef}
        onCustomize={typeInteractions.handleCustomize}
        onChangeTemplate={typeInteractions.handleChangeTemplate}
        onClose={typeInteractions.closeCustomizeTarget}
      />
    </aside>
  )
})
