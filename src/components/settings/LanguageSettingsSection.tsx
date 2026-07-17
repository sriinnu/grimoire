import {
  APP_LOCALES,
  SYSTEM_UI_LANGUAGE,
  localeDisplayName,
  type AppLocale,
  type UiLanguagePreference,
} from '../../lib/i18nCore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from './primitives/SettingsGroup'
import type { SettingsBodyProps, SettingsTranslate } from './settingsTypes'

function buildLanguageOptions(t: SettingsTranslate, locale: AppLocale, systemLocale: AppLocale) {
  return [
    {
      value: SYSTEM_UI_LANGUAGE,
      label: t('settings.language.system', {
        language: localeDisplayName(systemLocale, locale),
      }),
    },
    ...APP_LOCALES.map((value) => ({
      value,
      label: localeDisplayName(value, locale),
    })),
  ]
}

/** Renders display-language preferences as System Settings-style groups. */
export function LanguageSettingsSection({
  t,
  locale,
  systemLocale,
  uiLanguage,
  setUiLanguage,
}: Pick<SettingsBodyProps, 't' | 'locale' | 'systemLocale' | 'uiLanguage' | 'setUiLanguage'>) {
  return (
    <div className="settings-hig-stack">
      <SettingsSectionTitle>{t('settings.language.title')}</SettingsSectionTitle>

      <SettingsGroup
        footnote={
          <>
            {t('settings.language.description')} {t('settings.language.summary')}
          </>
        }
      >
        <SettingsRow label={t('settings.language.label')}>
          <Select
            value={uiLanguage}
            onValueChange={(value) => setUiLanguage(value as UiLanguagePreference)}
          >
            <SelectTrigger
              className="w-56 bg-transparent"
              aria-label={t('settings.language.label')}
              data-testid="settings-ui-language"
              data-value={uiLanguage}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" data-anchor-strategy="popper">
              {buildLanguageOptions(t, locale, systemLocale).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}
