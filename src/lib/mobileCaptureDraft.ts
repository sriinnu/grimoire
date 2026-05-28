import { slugifyNoteStem } from '../utils/noteSlug'

export type MobileCaptureKind = 'dream' | 'journal' | 'memory' | 'note' | 'task'
export type MobileDeviceClass = 'ipad' | 'iphone'
export type MobileCaptureSource = 'camera' | 'pencil' | 'quick-capture' | 'share-extension' | 'voice'
export type MobileAttachmentKind = 'image' | 'sketch' | 'transcript' | 'voice'
export type MobileAttachmentReviewState = 'pending'

export interface MobileCaptureAttachmentInput {
  checksum?: string
  kind: MobileAttachmentKind
  localPath: string
  mimeType?: string
  name?: string
  reviewState?: MobileAttachmentReviewState
}

export interface MobileCaptureDraftInput {
  attachments?: MobileCaptureAttachmentInput[]
  body: string
  capturedAt?: Date
  deviceClass: MobileDeviceClass
  draftId?: string
  kind: MobileCaptureKind
  source: MobileCaptureSource
}

export interface MobileCaptureAttachment {
  checksum: string | null
  kind: MobileAttachmentKind
  localPath: string
  mimeType: string | null
  name: string
  reviewState: MobileAttachmentReviewState
}

export interface MobileCaptureDraft {
  attachments: MobileCaptureAttachment[]
  captureId: string
  content: string
  egress: 'blocked'
  locality: 'local'
  relativePath: string
  reviewState: 'pending'
  title: string
  typeName: string
}

export const MOBILE_CAPTURE_SCHEMA = 'grimoire-mobile-capture-v1'

const MOBILE_LOCAL_FRONTMATTER = [
  'locality: local',
  'egress: blocked',
  'created_from: mobile-capture',
  'mobile_review: pending',
  'mobile_review_outcome: pending',
  'review_required: true',
  'agent_context: blocked_until_review',
  'export_context: blocked_until_review',
  'sync_context: local_until_review',
  'storage_hint: files-provider-folder',
]

/** Builds a future iOS/iPad capture as readable Markdown, not hidden app state. */
export function buildMobileCaptureDraft({
  attachments: rawAttachments = [],
  body,
  capturedAt = new Date(),
  deviceClass,
  draftId,
  kind,
  source,
}: MobileCaptureDraftInput): MobileCaptureDraft {
  const cleanBody = normalizeBody(body)
  const date = formatLocalDate(capturedAt)
  const captureIdValue = captureId(capturedAt, draftId)
  const attachments = normalizeAttachments(rawAttachments)
  const typeName = typeForKind(kind)
  const title = titleForKind(kind, date)
  const relativePath = `${folderForKind(kind)}/${date}-${stemForKind(kind)}-${captureIdValue}.md`
  const status = statusForKind(kind)
  const content = buildContent({
    attachmentCount: attachments.length,
    body: bodyForKind(kind, cleanBody, attachments),
    capturedAt,
    captureId: captureIdValue,
    deviceClass,
    source,
    status,
    title,
    typeName,
  })

  return {
    attachments,
    captureId: captureIdValue,
    content,
    egress: 'blocked',
    locality: 'local',
    relativePath,
    reviewState: 'pending',
    title,
    typeName,
  }
}

function buildContent({
  attachmentCount,
  body,
  capturedAt,
  captureId,
  deviceClass,
  source,
  status,
  title,
  typeName,
}: {
  attachmentCount: number
  body: string
  capturedAt: Date
  captureId: string
  deviceClass: MobileDeviceClass
  source: MobileCaptureSource
  status: string | null
  title: string
  typeName: string
}): string {
  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    `type: ${typeName}`,
    ...(status ? [`status: ${status}`] : []),
    `mobile_capture_schema: ${MOBILE_CAPTURE_SCHEMA}`,
    `mobile_capture_id: ${yamlString(captureId)}`,
    ...MOBILE_LOCAL_FRONTMATTER,
    `mobile_device: ${deviceClass}`,
    `mobile_source: ${source}`,
    `captured_at: ${yamlString(capturedAt.toISOString())}`,
    `attachment_count: ${attachmentCount}`,
    '---',
  ]
  return `${frontmatter.join('\n')}\n# ${title}\n\n${body}`
}

function bodyForKind(kind: MobileCaptureKind, body: string, attachments: MobileCaptureAttachment[]): string {
  const attachmentSection = mobileAttachmentSection(attachments)
  const review = mobileReviewSection(kind)
  if (kind === 'dream') return compactSections(`## Dream\n\n${body}`, '## Symbols', '## Emotional Weather', '## Thread', attachmentSection, review)
  if (kind === 'journal') return compactSections(`## Check-in\n\n${body}`, '## Signals', '## Next', attachmentSection, review)
  if (kind === 'memory') {
    return compactSections(
      '## Source\n\nMobile capture',
      `## Memory\n\n${body}`,
      '## Review\n\n- [ ] Crystallize or merge this memory.',
      attachmentSection,
      review,
    )
  }
  if (kind === 'task') return compactSections(`- [ ] ${taskText(body)}`, attachmentSection, review)
  return compactSections(body, attachmentSection, review)
}

function defaultTitle(kind: MobileCaptureKind, date: string): string {
  if (kind === 'dream') return `Dream ${date}`
  if (kind === 'journal') return `Journal ${date}`
  if (kind === 'memory') return `Memory ${date}`
  if (kind === 'task') return `Task ${date}`
  return `Note ${date}`
}

function mobileReviewSection(kind: MobileCaptureKind): string {
  const items = [
    'Rename only after the title is safe to expose.',
    'Move or merge this capture into the right vault note.',
    'Decide whether any part may leave local context.',
  ]
  if (kind === 'dream') items.push('Keep dream details local unless explicitly exported.')
  if (kind === 'journal') items.push('Keep journal details local unless explicitly exported.')
  if (kind === 'memory') items.push('Crystallize only after the memory source is clear.')
  return `## Mobile Review\n\n${items.map((item) => `- [ ] ${item}`).join('\n')}\n`
}

function mobileAttachmentSection(attachments: MobileCaptureAttachment[]): string {
  if (attachments.length === 0) return ''
  const rows = attachments.map((attachment) => {
    const mime = attachment.mimeType ? ` (${attachment.mimeType})` : ''
    return `- [ ] ${attachmentLabel(attachment.kind)}: ${attachment.name}${mime} - local asset pending review`
  })
  return `## Mobile Attachments\n\n${rows.join('\n')}`
}

function attachmentLabel(kind: MobileAttachmentKind): string {
  if (kind === 'image') return 'Image'
  if (kind === 'sketch') return 'Sketch'
  if (kind === 'transcript') return 'Transcript'
  return 'Voice'
}

function compactSections(...sections: string[]): string {
  return sections.map((section) => section.trim()).filter(Boolean).join('\n\n')
}

function captureId(capturedAt: Date, draftId: string | undefined): string {
  const explicit = normalizeDraftId(draftId)
  if (explicit) return explicit
  return `${utcTimeId(capturedAt)}-${randomId()}`
}

function folderForKind(kind: MobileCaptureKind): string {
  if (kind === 'dream') return 'dreams/mobile'
  if (kind === 'journal') return 'journals/mobile'
  if (kind === 'memory') return 'memory/mobile-inbox'
  if (kind === 'task') return 'tasks/mobile'
  return 'notes/mobile'
}

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function normalizeDraftId(value: string | undefined): string | null {
  const normalized = value?.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 24)
  return normalized || null
}

function normalizeBody(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim()
}

function normalizeAttachments(attachments: MobileCaptureAttachmentInput[]): MobileCaptureAttachment[] {
  return attachments.map((attachment, index) => ({
    checksum: cleanOptionalText(attachment.checksum),
    kind: attachment.kind,
    localPath: attachment.localPath,
    mimeType: cleanOptionalText(attachment.mimeType),
    name: attachmentName(attachment, index),
    reviewState: 'pending',
  }))
}

function attachmentName(attachment: MobileCaptureAttachmentInput, index: number): string {
  const explicit = cleanOptionalText(attachment.name)
  if (explicit) return safeAttachmentName(explicit)
  const basename = basenameForPath(attachment.localPath)
  return basename ? safeAttachmentName(basename) : `attachment-${index + 1}`
}

function basenameForPath(value: string): string {
  const withoutQuery = value.split(/[?#]/)[0] ?? ''
  const segments = withoutQuery.split(/[\\/]/).filter(Boolean)
  return segments.at(-1)?.trim() ?? ''
}

function cleanOptionalText(value: string | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned || null
}

function safeAttachmentName(value: string): string {
  const cleaned = Array.from(value)
    .filter((char) => !isUnsafeAttachmentNameChar(char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || 'attachment'
}

function isUnsafeAttachmentNameChar(char: string): boolean {
  return char.charCodeAt(0) < 32 || '<>:"|?*'.includes(char)
}

function statusForKind(kind: MobileCaptureKind): string | null {
  if (kind === 'memory') return 'Review'
  if (kind === 'task') return 'Open'
  return null
}

function randomId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) return randomUuid.replace(/-/g, '').slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

function stemForKind(kind: MobileCaptureKind): string {
  return slugifyNoteStem(typeForKind(kind))
}

function titleForKind(kind: MobileCaptureKind, date: string): string {
  return defaultTitle(kind, date)
}

function taskText(body: string): string {
  return body.replace(/^[-*]\s+\[[ xX]\]\s+/, '').trim()
}

function utcTimeId(date: Date): string {
  return date.toISOString().slice(11, 19).replace(/:/g, '')
}

function typeForKind(kind: MobileCaptureKind): string {
  if (kind === 'dream') return 'Dream'
  if (kind === 'journal') return 'Journal'
  if (kind === 'memory') return 'Memory'
  if (kind === 'task') return 'Task'
  return 'Note'
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/\n+/g, ' ').trim())
}
