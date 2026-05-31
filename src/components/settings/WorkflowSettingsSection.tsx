import { SectionHeading, SettingsSwitchRow } from './SettingsControls'
import type { SettingsBodyProps } from './settingsTypes'

interface WorkflowRunwayStep {
  detail: string
  label: string
  state: 'steady' | 'active' | 'manual'
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
      state: 'steady',
    },
    {
      label: t('settings.workflow.runway.inbox'),
      detail: explicitOrganization
        ? t('settings.workflow.runway.inboxExplicitDetail')
        : t('settings.workflow.runway.inboxSimpleDetail'),
      status: explicitOrganization
        ? t('settings.workflow.runway.inboxOn')
        : t('settings.workflow.runway.inboxOff'),
      state: explicitOrganization ? 'active' : 'manual',
    },
    {
      label: t('settings.workflow.runway.flow'),
      detail: autoAdvanceInboxAfterOrganize
        ? t('settings.workflow.runway.flowAutoDetail')
        : t('settings.workflow.runway.flowManualDetail'),
      status: autoAdvanceInboxAfterOrganize
        ? t('settings.workflow.runway.flowAuto')
        : t('settings.workflow.runway.flowManual'),
      state: autoAdvanceInboxAfterOrganize ? 'active' : 'manual',
    },
    {
      label: t('settings.workflow.runway.titles'),
      detail: initialH1AutoRename
        ? t('settings.workflow.runway.titlesAutoDetail')
        : t('settings.workflow.runway.titlesManualDetail'),
      status: initialH1AutoRename
        ? t('settings.workflow.runway.titlesAuto')
        : t('settings.workflow.runway.titlesManual'),
      state: initialH1AutoRename ? 'active' : 'manual',
    },
  ]
}

function WorkflowRunway(props: Pick<
  SettingsBodyProps,
  't' | 'explicitOrganization' | 'autoAdvanceInboxAfterOrganize' | 'initialH1AutoRename'
>) {
  const steps = buildWorkflowRunwaySteps(props)
  return (
    <div className="settings-workflow-runway" data-testid="settings-workflow-runway" aria-label={props.t('settings.workflow.runway.aria')}>
      {steps.map((step, index) => (
        <div className="settings-workflow-runway__step" data-state={step.state} key={step.label}>
          <span className="settings-workflow-runway__index">{index + 1}</span>
          <span className="settings-workflow-runway__content">
            <span className="settings-workflow-runway__label">{step.label}</span>
            <span className="settings-workflow-runway__detail">{step.detail}</span>
          </span>
          <span className="settings-workflow-runway__status">{step.status}</span>
        </div>
      ))}
    </div>
  )
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
  return (
    <>
      <SectionHeading
        title={t('settings.workflow.title')}
        description={t('settings.workflow.description')}
      />

      <WorkflowRunway
        t={t}
        explicitOrganization={explicitOrganization}
        autoAdvanceInboxAfterOrganize={autoAdvanceInboxAfterOrganize}
        initialH1AutoRename={initialH1AutoRename}
      />

      <SettingsSwitchRow
        label={t('settings.workflow.explicit')}
        description={t('settings.workflow.explicitDescription')}
        checked={explicitOrganization}
        onChange={setExplicitOrganization}
        testId="settings-explicit-organization"
      />

      <SettingsSwitchRow
        label={t('settings.workflow.autoAdvance')}
        description={t('settings.workflow.autoAdvanceDescription')}
        checked={autoAdvanceInboxAfterOrganize}
        onChange={setAutoAdvanceInboxAfterOrganize}
        testId="settings-auto-advance-inbox-after-organize"
      />

      <SettingsSwitchRow
        label={t('settings.titles.autoRename')}
        description={t('settings.titles.autoRenameDescription')}
        checked={initialH1AutoRename}
        onChange={setInitialH1AutoRename}
        testId="settings-initial-h1-auto-rename"
      />
    </>
  )
}
