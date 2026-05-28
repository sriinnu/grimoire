import { interpolate, type AppLocale, type TranslationValues } from './i18nCore'

const EN_NOTE_LIST_TRANSLATIONS = {
  'noteList.title.archive': 'Archive',
  'noteList.title.changes': 'Changes',
  'noteList.title.inbox': 'Inbox',
  'noteList.title.history': 'History',
  'noteList.title.view': 'View',
  'noteList.title.notes': 'Notes',
  'noteList.searchPlaceholder': 'Search notes...',
  'noteList.searchAction': 'Search notes',
  'noteList.createNote': 'Create new note',
  'noteList.empty.changesError': 'Failed to load changes: {error}',
  'noteList.empty.noChanges': 'No pending changes',
  'noteList.empty.noArchived': 'No archived notes',
  'noteList.empty.noMatching': 'No matching notes',
  'noteList.empty.allOrganized': 'All notes are organized',
  'noteList.empty.noNotes': 'No notes found',
  'noteList.empty.noMatchingItems': 'No matching items',
  'noteList.empty.noRelatedItems': 'No related items',
} as const

export type NoteListTranslationKey = keyof typeof EN_NOTE_LIST_TRANSLATIONS

const ZH_HANS_NOTE_LIST_TRANSLATIONS: Partial<Record<NoteListTranslationKey, string>> = {
  'noteList.title.archive': '归档',
  'noteList.title.changes': '更改',
  'noteList.title.inbox': 'Inbox',
  'noteList.title.history': '历史',
  'noteList.title.view': '视图',
  'noteList.title.notes': '笔记',
  'noteList.searchPlaceholder': '搜索笔记...',
  'noteList.searchAction': '搜索笔记',
  'noteList.createNote': '新建笔记',
  'noteList.empty.changesError': '加载更改失败：{error}',
  'noteList.empty.noChanges': '没有待处理更改',
  'noteList.empty.noArchived': '没有归档笔记',
  'noteList.empty.noMatching': '没有匹配的笔记',
  'noteList.empty.allOrganized': '所有笔记都已整理',
  'noteList.empty.noNotes': '没有笔记',
  'noteList.empty.noMatchingItems': '没有匹配项',
  'noteList.empty.noRelatedItems': '没有相关项',
}

const NOTE_LIST_TRANSLATIONS: Record<AppLocale, Partial<Record<NoteListTranslationKey, string>>> = {
  en: EN_NOTE_LIST_TRANSLATIONS,
  'zh-Hans': ZH_HANS_NOTE_LIST_TRANSLATIONS,
  de: {},
  hi: {},
  sa: {},
}

/** Translate hot note-list chrome without loading Settings/portability translations. */
export function translateNoteList(locale: AppLocale, key: NoteListTranslationKey, values?: TranslationValues): string {
  const template = NOTE_LIST_TRANSLATIONS[locale]?.[key] ?? EN_NOTE_LIST_TRANSLATIONS[key]
  return interpolate(template, values)
}
