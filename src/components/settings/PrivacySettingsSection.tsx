import { SectionHeading, TelemetryToggle } from './SettingsControls'
import type { SettingsBodyProps } from './settingsTypes'

/** Renders privacy and telemetry preferences. */
export function PrivacySettingsSection({
  t,
  crashReporting,
  setCrashReporting,
  analytics,
  setAnalytics,
}: Pick<SettingsBodyProps, 't' | 'crashReporting' | 'setCrashReporting' | 'analytics' | 'setAnalytics'>) {
  return (
    <>
      <SectionHeading
        title={t('settings.privacy.title')}
        description={t('settings.privacy.description')}
      />

      <TelemetryToggle
        label={t('settings.privacy.crashReporting')}
        description={t('settings.privacy.crashReportingDescription')}
        checked={crashReporting}
        onChange={setCrashReporting}
        testId="settings-crash-reporting"
      />
      <TelemetryToggle
        label={t('settings.privacy.analytics')}
        description={t('settings.privacy.analyticsDescription')}
        checked={analytics}
        onChange={setAnalytics}
        testId="settings-analytics"
      />
    </>
  )
}
