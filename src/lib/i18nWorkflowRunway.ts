export const EN_WORKFLOW_RUNWAY_TRANSLATIONS = {
  'settings.workflow.runway.aria': 'Daily assistant workflow',
  'settings.workflow.runway.brief': 'Daily brief',
  'settings.workflow.runway.briefDetail': 'Open items, journal nudges, dream capture, and quick notes stay local-first.',
  'settings.workflow.runway.local': 'Local',
  'settings.workflow.runway.inbox': 'Inbox triage',
  'settings.workflow.runway.inboxExplicitDetail': 'New captures wait in Inbox until you deliberately organize them.',
  'settings.workflow.runway.inboxSimpleDetail': 'Grimoire opens into the broader notes flow without an Inbox gate.',
  'settings.workflow.runway.inboxOn': 'Inbox on',
  'settings.workflow.runway.inboxOff': 'Simple flow',
  'settings.workflow.runway.flow': 'Flow-through',
  'settings.workflow.runway.flowAutoDetail': 'Organizing one Inbox note immediately moves you to the next visible item.',
  'settings.workflow.runway.flowManualDetail': 'You choose the next note manually after organizing.',
  'settings.workflow.runway.flowAuto': 'Auto',
  'settings.workflow.runway.flowManual': 'Manual',
  'settings.workflow.runway.titles': 'Title hygiene',
  'settings.workflow.runway.titlesAutoDetail': 'The first H1 can name untitled files without leaving Markdown.',
  'settings.workflow.runway.titlesManualDetail': 'Filenames wait until you rename them yourself.',
  'settings.workflow.runway.titlesAuto': 'H1 sync',
  'settings.workflow.runway.titlesManual': 'Manual',
} as const

type WorkflowRunwayKey = keyof typeof EN_WORKFLOW_RUNWAY_TRANSLATIONS
type WorkflowRunwayTranslations = Partial<Record<WorkflowRunwayKey, string>>

export const ZH_HANS_WORKFLOW_RUNWAY_TRANSLATIONS: WorkflowRunwayTranslations = {
  'settings.workflow.runway.aria': '每日助手工作流',
  'settings.workflow.runway.brief': '每日简报',
  'settings.workflow.runway.briefDetail': '待办、日记提醒、梦境捕捉和快速笔记都保持本地优先。',
  'settings.workflow.runway.local': '本地',
  'settings.workflow.runway.inbox': 'Inbox 整理',
  'settings.workflow.runway.inboxOn': 'Inbox 开启',
  'settings.workflow.runway.flow': '连续处理',
  'settings.workflow.runway.flowManual': '手动',
  'settings.workflow.runway.titles': '标题卫生',
  'settings.workflow.runway.titlesAuto': 'H1 同步',
}

export const DE_WORKFLOW_RUNWAY_TRANSLATIONS: WorkflowRunwayTranslations = {
  'settings.workflow.runway.aria': 'Taeglicher Assistenten-Workflow',
  'settings.workflow.runway.brief': 'Tagesbrief',
  'settings.workflow.runway.briefDetail': 'Offene Punkte, Journal-Anstoss, Traumfang und schnelle Notizen bleiben local-first.',
  'settings.workflow.runway.local': 'Lokal',
  'settings.workflow.runway.inbox': 'Inbox-Triage',
  'settings.workflow.runway.inboxOn': 'Inbox an',
  'settings.workflow.runway.flow': 'Weiterfluss',
  'settings.workflow.runway.flowManual': 'Manuell',
  'settings.workflow.runway.titles': 'Titelpflege',
  'settings.workflow.runway.titlesAuto': 'H1-Sync',
}

export const HI_WORKFLOW_RUNWAY_TRANSLATIONS: WorkflowRunwayTranslations = {
  'settings.workflow.runway.aria': 'दैनिक सहायक workflow',
  'settings.workflow.runway.brief': 'दैनिक brief',
  'settings.workflow.runway.briefDetail': 'Open items, journal nudges, dream capture, और quick notes local-first रहते हैं.',
  'settings.workflow.runway.local': 'लोकल',
  'settings.workflow.runway.inbox': 'Inbox छँटाई',
  'settings.workflow.runway.inboxOn': 'Inbox चालू',
  'settings.workflow.runway.flow': 'आगे बढ़ना',
  'settings.workflow.runway.flowManual': 'हस्तचालित',
  'settings.workflow.runway.titles': 'शीर्षक सफ़ाई',
  'settings.workflow.runway.titlesAuto': 'H1 साम्य',
}

export const SA_WORKFLOW_RUNWAY_TRANSLATIONS: WorkflowRunwayTranslations = {
  'settings.workflow.runway.aria': 'दैनिकः सहायकप्रवाहः',
  'settings.workflow.runway.brief': 'दैनिकसारः',
  'settings.workflow.runway.briefDetail': 'कार्याणि, दैनन्दिनी-स्मरणम्, स्वप्नग्रहणम्, शीघ्रटिप्पण्यः च स्थानीय-प्रथमाः तिष्ठन्ति.',
  'settings.workflow.runway.local': 'स्थानीयम्',
  'settings.workflow.runway.inbox': 'Inbox-विचयः',
  'settings.workflow.runway.inboxOn': 'Inbox चालितम्',
  'settings.workflow.runway.flow': 'प्रवाहः',
  'settings.workflow.runway.flowManual': 'हस्तेन',
  'settings.workflow.runway.titles': 'शीर्षकशुद्धिः',
  'settings.workflow.runway.titlesAuto': 'H1-साम्यम्',
}
