/** Default templates for built-in and signature Grimoire note types. */
export const JOURNAL_TEMPLATES = {
  daily: '## Check-in\n\nMood:\nEnergy:\nBody:\n\n## What Happened\n\n\n## Open Loops\n\n- [ ] \n\n## Gratitude\n\n\n## Tomorrow\n\n',
  evening: '## Evening Review\n\nWhat gave energy:\nWhat drained energy:\n\n## Decisions\n\n\n## Release\n\n',
  weekly: '## Week Thread\n\nWins:\nLessons:\nPatterns:\n\n## Next Week\n\n- [ ] \n',
  decision: '## Decision\n\nContext:\nOptions:\nChosen:\n\n## Why\n\n\n## Revisit\n\n',
} as const

export const DREAM_TEMPLATES = {
  capture: '## Dream\n\nScene:\nPeople:\nFeeling:\n\n## Symbols\n\n- \n\n## Emotional Weather\n\n\n## Thread\n\n',
  lucid: '## Lucid Moment\n\nTrigger:\nControl:\nStability:\n\n## Symbols\n\n- \n\n## Practice\n\n',
  nightmare: '## Nightmare\n\nFear:\nBody signal:\nExit point:\n\n## Reframe\n\n\n## Care\n\n',
  symbol: '## Symbol\n\nImage:\nColor:\nMovement:\n\n## Associations\n\n- \n\n## Repeats\n\n',
} as const

export type JournalTemplateId = keyof typeof JOURNAL_TEMPLATES
export type DreamTemplateId = keyof typeof DREAM_TEMPLATES
export type DashboardCaptureTemplateId = JournalTemplateId | DreamTemplateId

export interface DashboardTemplateOption {
  id: DashboardCaptureTemplateId
  label: string
  detail: string
}

export const JOURNAL_TEMPLATE_OPTIONS: DashboardTemplateOption[] = [
  { id: 'daily', label: 'Daily', detail: 'Mood, waiting threads, tomorrow' },
  { id: 'evening', label: 'Evening', detail: 'Energy, decisions, release' },
  { id: 'weekly', label: 'Weekly', detail: 'Patterns and next week' },
  { id: 'decision', label: 'Decision', detail: 'Choice with revisit point' },
]

export const DREAM_TEMPLATE_OPTIONS: DashboardTemplateOption[] = [
  { id: 'capture', label: 'Capture', detail: 'Scene, symbols, weather' },
  { id: 'lucid', label: 'Lucid', detail: 'Trigger and practice notes' },
  { id: 'nightmare', label: 'Nightmare', detail: 'Fear, reframe, care' },
  { id: 'symbol', label: 'Symbol', detail: 'Image and recurrence' },
]

export const DEFAULT_TEMPLATES: Record<string, string> = {
  Project: '## Objective\n\n\n\n## Key Results\n\n\n\n## Notes\n\n',
  Person: '## Role\n\n\n\n## Contact\n\n\n\n## Notes\n\n',
  Responsibility: '## Description\n\n\n\n## Key Activities\n\n\n\n## Notes\n\n',
  Experiment: '## Hypothesis\n\n\n\n## Method\n\n\n\n## Results\n\n\n\n## Conclusion\n\n',
  Journal: JOURNAL_TEMPLATES.daily,
  Dream: DREAM_TEMPLATES.capture,
  Task: '## Outcome\n\n\n\n## Next Action\n\n- [ ] \n\n## Notes\n\n',
  Memory: '## Source\n\n\n\n## Memory\n\n\n\n## Confidence\n\nmedium\n\n## Review\n\n- [ ] Verify or crystallize this memory.\n',
  Research: '## Question\n\n\n\n## Sources\n\n\n\n## Findings\n\n\n\n## Next\n\n',
}
