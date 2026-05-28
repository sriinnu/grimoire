import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { VaultEntry } from '../../types'
import type { AppLocale } from '../../lib/i18nCore'
import { translateNoteList } from '../../lib/i18nNoteList'
import { EmptyMessage } from './TrashWarningBanner'

function resolveEmptyText({
  isChangesView,
  changesError,
  isArchivedView,
  isInboxView,
  query,
  locale,
}: {
  isChangesView: boolean
  changesError: string | null | undefined
  isArchivedView: boolean
  isInboxView: boolean
  query: string
  locale: AppLocale
}): string {
  if (isChangesView && changesError) return translateNoteList(locale, 'noteList.empty.changesError', { error: changesError })
  if (isChangesView) return translateNoteList(locale, 'noteList.empty.noChanges')
  if (isArchivedView) return translateNoteList(locale, 'noteList.empty.noArchived')
  if (isInboxView) return query ? translateNoteList(locale, 'noteList.empty.noMatching') : translateNoteList(locale, 'noteList.empty.allOrganized')
  return query ? translateNoteList(locale, 'noteList.empty.noMatching') : translateNoteList(locale, 'noteList.empty.noNotes')
}

export function ListView({ isArchivedView, isChangesView, isInboxView, changesError, searched, query, renderItem, virtuosoRef, locale = 'en' }: {
  isArchivedView?: boolean; isChangesView?: boolean; isInboxView?: boolean; changesError?: string | null
  searched: VaultEntry[]; query: string
  renderItem: (entry: VaultEntry) => React.ReactNode
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>
  locale?: AppLocale
}) {
  const emptyText = resolveEmptyText({
    isChangesView: !!isChangesView,
    changesError: changesError ?? null,
    isArchivedView: !!isArchivedView,
    isInboxView: !!isInboxView,
    query,
    locale,
  })

  if (searched.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <EmptyMessage text={emptyText} />
      </div>
    )
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ height: '100%' }}
      data={searched}
      overscan={200}
      itemContent={(_index, entry) => renderItem(entry)}
    />
  )
}
