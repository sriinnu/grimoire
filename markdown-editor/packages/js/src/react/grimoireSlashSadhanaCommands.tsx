import { Activity, BookOpen, Clock3, Sparkles, Wind } from 'lucide-react'
import {
  insertMarkdown,
  type GrimoireCommandDefinition,
  type GrimoireDateContext,
} from './grimoireSlashCommandActions'

function markdown(lines: string[]) {
  return lines.join('\n')
}

function practiceSessionTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Practice Session - ${context.today} ${context.time}`,
    '',
    'Practice',
    '- ',
    '',
    'Timer',
    '- Start:',
    '- End:',
    '- Duration:',
    '',
    'Context',
    '- Location:',
    '- Hora:',
    '- Tithi:',
    '- Nakshatra:',
    '- Kala window:',
    '',
    'Score',
    '| Layer | Signal | Score |',
    '| --- | --- | --- |',
    '| Kala |  |  |',
    '| Hora |  |  |',
    '| Vara |  |  |',
    '| Tithi |  |  |',
    '| Rahu/Gulika/Yamaganda |  |  |',
    '',
    'Notes',
    '- ',
  ])
}

function panchangaSnapshotTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Panchanga Snapshot - ${context.today} ${context.time}`,
    '',
    '| Field | Value | Notes |',
    '| --- | --- | --- |',
    '| Location |  |  |',
    '| Sunrise |  |  |',
    '| Sunset |  |  |',
    '| Vara |  |  |',
    '| Hora |  |  |',
    '| Tithi |  |  |',
    '| Nakshatra |  |  |',
    '| Yoga |  |  |',
    '| Karana |  |  |',
    '| Brahma Muhurta |  |  |',
    '| Sandhya |  |  |',
    '| Rahu Kalam |  |  |',
  ])
}

function japaLogTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Japa Log - ${context.today}`,
    '',
    '| Mantra | Count | Mala | Hora | State |',
    '| --- | ---: | ---: | --- | --- |',
    '|  | 108 | 1 |  |  |',
    '',
    'Sankalpa',
    '- ',
    '',
    'After',
    '- ',
  ])
}

function pranayamaLogTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Pranayama Log - ${context.today} ${context.time}`,
    '',
    '| Practice | Ratio | Rounds | Duration |',
    '| --- | --- | ---: | --- |',
    '| Nadi Shodhana | 4:4:8:4 |  |  |',
    '',
    'Before',
    '- Breath:',
    '- Mind:',
    '',
    'After',
    '- Breath:',
    '- Mind:',
  ])
}

function prescriptionTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Practice Prescription - ${context.today}`,
    '',
    '| Candidate | Type | Why now | Score |',
    '| --- | --- | --- | ---: |',
    '|  | Pranayama |  |  |',
    '|  | Mantra |  |  |',
    '|  | Dhyana |  |  |',
    '|  | Svadhyaya |  |  |',
    '',
    'Decision',
    '- [ ] Practice now',
    '- [ ] Defer',
    '- [ ] Avoid due to timing',
  ])
}

/** Spanda-inspired sadhana commands stored as portable Markdown notes. */
export const GRIMOIRE_SADHANA_SLASH_COMMANDS: GrimoireCommandDefinition[] = [
  {
    key: 'grimoire_sadhana_session',
    title: 'Practice Session',
    subtext: 'Log a Spanda-style timed practice with moment context.',
    aliases: ['spanda', 'sadhana', 'practice', 'session', 'timer'],
    group: 'Practice',
    icon: Clock3,
    run: (editor, context) => insertMarkdown(editor, practiceSessionTemplate(context)),
  },
  {
    key: 'grimoire_panchanga_snapshot',
    title: 'Panchanga Snapshot',
    subtext: 'Capture hora, tithi, nakshatra, kala, and caution windows.',
    aliases: ['panchanga', 'hora', 'tithi', 'nakshatra', 'rahu kalam'],
    group: 'Practice',
    icon: Sparkles,
    run: (editor, context) => insertMarkdown(editor, panchangaSnapshotTemplate(context)),
  },
  {
    key: 'grimoire_japa_log',
    title: 'Japa Log',
    subtext: 'Track mantra count, mala rounds, sankalpa, and after-state.',
    aliases: ['japa', 'mantra', 'mala', '108', 'chant'],
    group: 'Practice',
    icon: Activity,
    run: (editor, context) => insertMarkdown(editor, japaLogTemplate(context)),
  },
  {
    key: 'grimoire_pranayama_log',
    title: 'Pranayama Log',
    subtext: 'Track breath ratio, rounds, duration, and nervous-system state.',
    aliases: ['pranayama', 'breath', 'nadi shodhana', 'bhramari', 'breathwork'],
    group: 'Practice',
    icon: Wind,
    run: (editor, context) => insertMarkdown(editor, pranayamaLogTemplate(context)),
  },
  {
    key: 'grimoire_practice_prescription',
    title: 'Practice Prescription',
    subtext: 'Compare practices by timing signal before choosing what to do.',
    aliases: ['prescriber', 'score', 'right practice', 'jyotisha', 'recommend'],
    group: 'Practice',
    icon: BookOpen,
    run: (editor, context) => insertMarkdown(editor, prescriptionTemplate(context)),
  },
]
