import { Edit3, PenTool, Shapes } from 'lucide-react'
import {
  insertMarkdown,
  type GrimoireCommandDefinition,
  type GrimoireDateContext,
} from './grimoireSlashCommandActions'

function lines(markdownLines: string[]) {
  return markdownLines.join('\n')
}

function canvasAttachmentName(kind: string, context: GrimoireDateContext) {
  return `${kind}-${context.canvasStamp}`
}

function canvasBlock(kind: 'handwriting' | 'whiteboard', context: GrimoireDateContext) {
  const stem = canvasAttachmentName(kind, context)
  const title = kind === 'handwriting' ? 'Handwritten Canvas' : 'Whiteboard Canvas'
  return lines([
    `## ${title} - ${context.today}`,
    '',
    `![${title}](attachments/${stem}.png)`,
    '',
    '```grimoire-canvas',
    `type: ${kind}`,
    `source: attachments/${stem}.grimoire-canvas.json`,
    `preview: attachments/${stem}.png`,
    '```',
  ])
}

function sketchBlock(context: GrimoireDateContext) {
  return lines([
    `## Sketch Note - ${context.today}`,
    '',
    'Prompt',
    '- ',
    '',
    ...canvasBlock('handwriting', context).split('\n'),
    '',
    'Notes',
    '- ',
  ])
}

/** Slash commands that insert the portable Markdown contract for editable canvas attachments. */
export const GRIMOIRE_CANVAS_SLASH_COMMANDS: GrimoireCommandDefinition[] = [
  {
    key: 'grimoire_handwritten_canvas',
    title: 'Handwritten Canvas',
    subtext: 'Attach an editable handwriting canvas with a Markdown preview.',
    aliases: ['canvas', 'handwriting', 'handwritten', 'ink', 'pencil', 'sketch'],
    group: 'Canvas',
    icon: PenTool,
    run: (editor, context) => insertMarkdown(editor, canvasBlock('handwriting', context)),
  },
  {
    key: 'grimoire_whiteboard_canvas',
    title: 'Whiteboard Canvas',
    subtext: 'Attach a whiteboard canvas for diagrams and freeform thinking.',
    aliases: ['whiteboard', 'canvas', 'diagram canvas', 'draw', 'excalidraw'],
    group: 'Canvas',
    icon: Shapes,
    run: (editor, context) => insertMarkdown(editor, canvasBlock('whiteboard', context)),
  },
  {
    key: 'grimoire_sketch_note',
    title: 'Sketch Note',
    subtext: 'Create a note scaffold around a handwritten canvas.',
    aliases: ['sketch note', 'hand note', 'draw note', 'pencil note'],
    group: 'Canvas',
    icon: Edit3,
    run: (editor, context) => insertMarkdown(editor, sketchBlock(context)),
  },
]
