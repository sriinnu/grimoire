export const APP_STORAGE_KEYS = {
  theme: 'grimoire-theme',
  zoom: 'grimoire:zoom-level',
  viewMode: 'grimoire-view-mode',
  tagColors: 'grimoire:tag-color-overrides',
  statusColors: 'grimoire:status-color-overrides',
  propertyModes: 'grimoire:display-mode-overrides',
  configMigrationFlag: 'grimoire:config-migrated-to-vault',
  legacyMigrationFlag: 'grimoire:legacy-storage-migrated',
  sortPreferences: 'grimoire-sort-preferences',
  sidebarCollapsed: 'grimoire:sidebar-collapsed',
  sidebarColumnCollapsed: 'grimoire:sidebar-column-collapsed',
  welcomeDismissed: 'grimoire_welcome_dismissed',
} as const

export const LEGACY_APP_STORAGE_KEYS = {
  theme: 'tolaria-theme',
  zoom: 'tolaria:zoom-level',
  viewMode: 'tolaria-view-mode',
  tagColors: 'tolaria:tag-color-overrides',
  statusColors: 'tolaria:status-color-overrides',
  propertyModes: 'tolaria:display-mode-overrides',
  configMigrationFlag: 'tolaria:config-migrated-to-vault',
  sortPreferences: 'tolaria-sort-preferences',
  sidebarCollapsed: 'tolaria:sidebar-collapsed',
  sidebarColumnCollapsed: 'tolaria:sidebar-column-collapsed',
  welcomeDismissed: 'tolaria_welcome_dismissed',
} as const

export const LAPUTA_LEGACY_APP_STORAGE_KEYS = {
  theme: 'laputa-theme',
  zoom: 'laputa:zoom-level',
  viewMode: 'laputa-view-mode',
  tagColors: 'laputa:tag-color-overrides',
  statusColors: 'laputa:status-color-overrides',
  propertyModes: 'laputa:display-mode-overrides',
  configMigrationFlag: 'laputa:config-migrated-to-vault',
  sortPreferences: 'laputa-sort-preferences',
  sidebarCollapsed: 'laputa:sidebar-collapsed',
  sidebarColumnCollapsed: 'laputa:sidebar-column-collapsed',
  welcomeDismissed: 'laputa_welcome_dismissed',
} as const

type MigratableStorageKey = keyof typeof LEGACY_APP_STORAGE_KEYS

const MIGRATABLE_STORAGE_KEYS: MigratableStorageKey[] = [
  'theme',
  'zoom',
  'viewMode',
  'tagColors',
  'statusColors',
  'propertyModes',
  'configMigrationFlag',
  'sortPreferences',
  'sidebarCollapsed',
  'sidebarColumnCollapsed',
  'welcomeDismissed',
]

export function copyLegacyAppStorageKeys(): void {
  try {
    if (localStorage.getItem(APP_STORAGE_KEYS.legacyMigrationFlag) === '1') return

    for (const key of MIGRATABLE_STORAGE_KEYS) {
      if (localStorage.getItem(APP_STORAGE_KEYS[key]) !== null) continue

      const legacyValue = localStorage.getItem(LEGACY_APP_STORAGE_KEYS[key])
        ?? localStorage.getItem(LAPUTA_LEGACY_APP_STORAGE_KEYS[key])
      if (legacyValue !== null) {
        localStorage.setItem(APP_STORAGE_KEYS[key], legacyValue)
      }
    }

    localStorage.setItem(APP_STORAGE_KEYS.legacyMigrationFlag, '1')
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

export function getAppStorageItem(key: MigratableStorageKey): string | null {
  try {
    return localStorage.getItem(APP_STORAGE_KEYS[key])
      ?? localStorage.getItem(LEGACY_APP_STORAGE_KEYS[key])
      ?? localStorage.getItem(LAPUTA_LEGACY_APP_STORAGE_KEYS[key])
  } catch {
    return null
  }
}
