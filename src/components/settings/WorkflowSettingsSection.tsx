import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from './primitives/SettingsGroup'
import { Switch } from '../ui/switch'
import type { SettingsBodyProps } from './settingsTypes'

interface WorkflowRunwayStep {
  detail: string
  label: string
  status: string
}

function buildWorkflowRunwaySteps({
  t,
  explicitOrganization,
  autoAdvanceInboxAfterOrganize,
  initialH1AutoRename,
}: Pick<
  SettingsBodyProps,
  't' | 'explicitOrganization' | 'autoAdvanceInboxAfterOrganize' | 'initialH1AutoRename'
>): WorkflowRunwayStep[] {
  return [
    {
      label: t('settings.workflow.runway.brief'),
      detail: t('settings.workflow.runway.briefDetail'),
      status: t('settings.workflow.runway.local'),
    },
    {
      label: t('settings.workflow.runway.inbox'),
      detail: explicitOrganization
        ? t('settings.workflow.runway.inboxExplicitDetail')
        : t('settings.workflow.runway.inboxSimpleDetail'),
      status: explicitOrganization
        ? t('settings.workflow.runway.inboxOn')
        : t('settings.workflow.runway.inboxOff'),
    },
    {
      label: t('settings.workflow.runway.flow'),
      detail: autoAdvanceInboxAfterOrganize
        ? t('settings.workflow.runway.flowAutoDetail')
        : t('settings.workflow.runway.flowManualDetail'),
      status: autoAdvanceInboxAfterOrganize
        ? t('settings.workflow.runway.flowAuto')
        : t('settings.workflow.runway.flowManual'),
    },
    {
      label: t('settings.workflow.runway.titles'),
      detail: initialH1AutoRename
        ? t('settings.workflow.runway.titlesAutoDetail')
        : t('settings.workflow.runway.titlesManualDetail'),
      status: initialH1AutoRename
        ? t('settings.workflow.runway.titlesAuto')
        : t('settings.workflow.runway.titlesManual'),
    },
  ]
}

/** Renders Inbox and title workflow preferences. */
export function WorkflowSettingsSection({
  t,
  initialH1AutoRename,
  setInitialH1AutoRename,
  explicitOrganization,
  setExplicitOrganization,
  autoAdvanceInboxAfterOrganize,
  setAutoAdvanceInboxAfterOrganize,
}: Pick<
  SettingsBodyProps,
  | 't'
  | 'initialH1AutoRename'
  | 'setInitialH1AutoRename'
  | 'explicitOrganization'
  | 'setExplicitOrganization'
  | 'autoAdvanceInboxAfterOrganize'
  | 'setAutoAdvanceInboxAfterOrganize'
>) {
  const runwaySteps = buildWorkflowRunwaySteps({
    t,
    explicitOrganization,
    autoAdvanceInboxAfterOrganize,
    initialH1AutoRename,
  })

  return (
    <div className="settings-hig-stack">
      <SettingsSectionTitle>{t('settings.workflow.title')}</SettingsSectionTitle>

      <div
        data-testid="settings-workflow-runway"
        aria-label={t('settings.workflow.runway.aria')}
      >
        <SettingsGroup title={t('settings.workflow.runway.aria')}>
          {runwaySteps.map((step) => (
            <SettingsRow key={step.label} label={step.label} description={step.detail}>
              <span className="text-[11px] font-medium text-muted-foreground">{step.status}</span>
            </SettingsRow>
          ))}
        </SettingsGroup>
      </div>

      <SettingsGroup
        title={t('settings.workflow.runway.inbox')}
        footnote={t('settings.workflow.description')}
      >
        <SettingsRow
          testId="settings-explicit-organization"
          label={t('settings.workflow.explicit')}
          description={t('settings.workflow.explicitDescription')}
        >
          <Switch
            checked={explicitOrganization}
            onCheckedChange={setExplicitOrganization}
            aria-label={t('settings.workflow.explicit')}
          />
        </SettingsRow>
        <SettingsRow
          testId="settings-auto-advance-inbox-after-organize"
          label={t('settings.workflow.autoAdvance')}
          description={t('settings.workflow.autoAdvanceDescription')}
        >
          <Switch
            checked={autoAdvanceInboxAfterOrganize}
            onCheckedChange={setAutoAdvanceInboxAfterOrganize}
            aria-label={t('settings.workflow.autoAdvance')}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.titles.title')}
        footnote={t('settings.titles.autoRenameDescription')}
      >
        <SettingsRow
          testId="settings-initial-h1-auto-rename"
          label={t('settings.titles.autoRename')}
          description={t('settings.titles.description')}
        >
          <Switch
            checked={initialH1AutoRename}
            onCheckedChange={setInitialH1AutoRename}
            aria-label={t('settings.titles.autoRename')}
          />
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}
