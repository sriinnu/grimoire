/** Ordered Settings sections used by scroll tracking and both navigation rails. */
export const SETTINGS_SECTION_IDS = [
  'settings-portability',
  'settings-sync',
  'settings-appearance',
  'settings-workflow',
  'settings-agents',
  'settings-language',
  'settings-native',
  'settings-privacy',
] as const

/** Returns the Settings section nearest the top of the scrollable main surface. */
export function resolveActiveSettingsSection(container: HTMLElement | null): string | null {
  if (!container) return null
  const containerTop = container.getBoundingClientRect().top
  const sections = SETTINGS_SECTION_IDS
    .map((id) => document.getElementById(id))
    .filter((section): section is HTMLElement => Boolean(section))
  let activeSection = sections[0]?.id ?? null

  for (const section of sections) {
    if (section.getBoundingClientRect().top - containerTop > 36) break
    activeSection = section.id
  }

  return activeSection
}
