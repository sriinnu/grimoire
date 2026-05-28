import { describe, expect, it } from 'vitest'
import {
  localeDisplayName,
  normalizeUiLanguagePreference,
  resolveEffectiveLocale,
  serializeUiLanguagePreference,
  translate,
} from './i18n'

describe('i18n', () => {
  it('uses supported system languages before falling back to English', () => {
    expect(resolveEffectiveLocale(null, ['zh-CN'])).toBe('zh-Hans')
    expect(resolveEffectiveLocale('system', ['fr-FR'])).toBe('en')
  })

  it('normalizes stored language preferences', () => {
    expect(normalizeUiLanguagePreference(' zh-cn ')).toBe('zh-Hans')
    expect(normalizeUiLanguagePreference('auto')).toBe('system')
    expect(normalizeUiLanguagePreference('fr-FR')).toBeNull()
  })

  it('serializes system preference as the settings default', () => {
    expect(serializeUiLanguagePreference('system')).toBeNull()
    expect(serializeUiLanguagePreference('zh-Hans')).toBe('zh-Hans')
  })

  it('falls back to English when a locale is partially translated', () => {
    expect(translate('zh-Hans', 'settings.aiAgents.description')).toBe(
      translate('en', 'settings.aiAgents.description'),
    )
  })

  it('formats locale display names in the active language', () => {
    expect(localeDisplayName('zh-Hans', 'zh-Hans')).toBe('简体中文')
    expect(localeDisplayName('en', 'zh-Hans')).toBe('英文')
  })

  it('keeps object-storage wording on proof boundaries instead of ready sync', () => {
    const objectStorageCopy = [
      translate('en', 'settings.portability.objectStoragePrototype'),
      translate('en', 'settings.portability.objectStoragePrototypeDescription'),
      translate('en', 'settings.portability.s3ProviderSync'),
      translate('en', 'settings.portability.s3ProviderSyncDescription'),
      translate('en', 'settings.portability.azureProviderSync'),
      translate('en', 'settings.portability.azureProviderSyncDescription'),
    ].join('\n')

    expect(objectStorageCopy).toContain('Object storage proof boundary')
    expect(objectStorageCopy).toContain('preview/apply evidence')
    expect(objectStorageCopy).toContain('live failure-state proof is still required')
    expect(objectStorageCopy).not.toMatch(/Object storage sync proof|provider SDK sync|Preview and apply live/)
  })
})
