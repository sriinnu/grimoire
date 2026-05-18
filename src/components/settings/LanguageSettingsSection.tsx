import {
  SYSTEM_UI_LANGUAGE,
  localeDisplayName,
  type AppLocale,
  type UiLanguagePreference,
} from '../../lib/i18n'
import { LabeledSelect, SectionHeading } from './SettingsControls'
import type { SettingsBodyProps, SettingsTranslate } from './settingsTypes'

function buildLanguageOptions(t: SettingsTranslate, locale: AppLocale, systemLocale: AppLocale) {
  return [
    {
      value: SYSTEM_UI_LANGUAGE,
      label: t('settings.language.system', {
        language: localeDisplayName(systemLocale, locale),
      }),
    },
    { value: 'en', label: t('settings.language.en') },
    { value: 'zh-Hans', label: t('settings.language.zhHans') },
  ]
}

/** Renders display-language preferences. */
export function LanguageSettingsSection({
  t,
  locale,
  systemLocale,
  uiLanguage,
  setUiLanguage,
}: Pick<SettingsBodyProps, 't' | 'locale' | 'systemLocale' | 'uiLanguage' | 'setUiLanguage'>) {
  return (
    <>
      <SectionHeading
        title={t('settings.language.title')}
        description={t('settings.language.description')}
      />

      <LabeledSelect
        label={t('settings.language.label')}
        value={uiLanguage}
        onValueChange={(value) => setUiLanguage(value as UiLanguagePreference)}
        options={buildLanguageOptions(t, locale, systemLocale)}
        testId="settings-ui-language"
      />

      <div className="text-[11px] leading-relaxed text-muted-foreground">
        {t('settings.language.summary')}
      </div>
    </>
  )
}
