export interface EditorReferenceFeature {
  source: 'mem' | 'bear'
  feature: string
  grimoireCommandKeys: string[]
  notes: string
}

export const EDITOR_REFERENCE_FEATURES: EditorReferenceFeature[] = [
  {
    source: 'mem',
    feature: 'Slash date insertion',
    grimoireCommandKeys: [
      'grimoire_today',
      'grimoire_tomorrow',
      'grimoire_yesterday',
      'grimoire_daily_note_link',
    ],
    notes: 'Mem exposes date insertion through slash commands; Grimoire keeps them local-date safe.',
  },
  {
    source: 'mem',
    feature: 'Mentions and collections',
    grimoireCommandKeys: ['grimoire_note_mention', 'grimoire_wikilink', 'grimoire_tag'],
    notes: 'Mem uses @ for note references and # for collections; Grimoire maps that to wikilinks and markdown tags.',
  },
  {
    source: 'mem',
    feature: 'Clean Up, Heads Up, and Chat-style memory actions',
    grimoireCommandKeys: [
      'grimoire_cleanup_prompt',
      'grimoire_summarize_note',
      'grimoire_extract_actions',
      'grimoire_create_wikilinks',
      'grimoire_related_context',
      'grimoire_ai_prompt',
    ],
    notes: 'Current commands insert durable prompts/sections; future shells can bind the same command keys to live AI transforms.',
  },
  {
    source: 'bear',
    feature: 'Portable markdown authoring',
    grimoireCommandKeys: [
      'heading',
      'bullet_list',
      'numbered_list',
      'check_list',
      'table',
      'grimoire_footnote',
      'grimoire_inline_code',
      'grimoire_source_block',
    ],
    notes: 'Bear-like durability means commands must save as readable markdown, not editor-private JSON.',
  },
]
