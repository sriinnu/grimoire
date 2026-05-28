import { describe, expect, it } from 'vitest'
import fixture from './mobileCaptureDraft.fixture.json'
import {
  buildMobileCaptureDraft,
  MOBILE_CAPTURE_SCHEMA,
  type MobileAttachmentKind,
  type MobileCaptureKind,
  type MobileCaptureSource,
  type MobileDeviceClass,
} from './mobileCaptureDraft'

const capturedAt = new Date('2026-05-25T10:30:00.000Z')

describe('buildMobileCaptureDraft', () => {
  it('creates protected journal Markdown for mobile review', () => {
    const draft = buildMobileCaptureDraft({
      body: 'What is alive today',
      capturedAt,
      deviceClass: 'iphone',
      draftId: 'journal-a',
      kind: 'journal',
      source: 'quick-capture',
    })

    expect(draft.relativePath).toBe('journals/mobile/2026-05-25-journal-journal-a.md')
    expect(draft.captureId).toBe('journal-a')
    expect(draft.title).toBe('Journal 2026-05-25')
    expect(draft.locality).toBe('local')
    expect(draft.egress).toBe('blocked')
    expect(draft.content).toContain('title: "Journal 2026-05-25"')
    expect(draft.content).toContain('# Journal 2026-05-25')
    expect(draft.content).toContain('type: Journal')
    expect(draft.content).toContain(`mobile_capture_schema: ${MOBILE_CAPTURE_SCHEMA}`)
    expect(draft.content).toContain('mobile_capture_id: "journal-a"')
    expect(draft.content).toContain('mobile_review: pending')
    expect(draft.content).toContain('mobile_review_outcome: pending')
    expect(draft.content).toContain('review_required: true')
    expect(draft.content).toContain('agent_context: blocked_until_review')
    expect(draft.content).toContain('export_context: blocked_until_review')
    expect(draft.content).toContain('sync_context: local_until_review')
    expect(draft.content).toContain('storage_hint: files-provider-folder')
    expect(draft.content).toContain('attachment_count: 0')
    expect(draft.content).toContain('## Check-in')
    expect(draft.content).toContain('## Mobile Review')
    expect(draft.content).toContain('- [ ] Rename only after the title is safe to expose.')
  })

  it('keeps dream capture in a protected lane without hidden state', () => {
    const draft = buildMobileCaptureDraft({
      body: 'River and blue light',
      capturedAt,
      deviceClass: 'ipad',
      draftId: 'dream-a',
      kind: 'dream',
      source: 'voice',
    })

    expect(draft.relativePath).toBe('dreams/mobile/2026-05-25-dream-dream-a.md')
    expect(draft.content).toContain('type: Dream')
    expect(draft.content).toContain('mobile_device: ipad')
    expect(draft.content).toContain('mobile_source: voice')
    expect(draft.content).toContain('## Emotional Weather')
    expect(draft.content).toContain('- [ ] Keep dream details local unless explicitly exported.')
  })

  it('turns phone tasks into reviewable Markdown checkboxes', () => {
    const draft = buildMobileCaptureDraft({
      body: '- [ ] Call accountant',
      capturedAt,
      deviceClass: 'iphone',
      draftId: 'task-a',
      kind: 'task',
      source: 'share-extension',
    })

    expect(draft.typeName).toBe('Task')
    expect(draft.content).toContain('status: Open')
    expect(draft.content).toContain('- [ ] Call accountant')
    expect(draft.content).toContain('## Mobile Review')
    expect(draft.content).not.toContain('- [ ] - [ ]')
  })

  it('puts mobile memories into review before they become durable knowledge', () => {
    const draft = buildMobileCaptureDraft({
      body: 'The user prefers one singleton app build.',
      capturedAt,
      deviceClass: 'iphone',
      draftId: 'memory-a',
      kind: 'memory',
      source: 'quick-capture',
    })

    expect(draft.relativePath).toBe('memory/mobile-inbox/2026-05-25-memory-memory-a.md')
    expect(draft.content).toContain('status: Review')
    expect(draft.content).toContain('## Source\n\nMobile capture')
    expect(draft.content).toContain('- [ ] Crystallize or merge this memory.')
  })

  it('falls back to a dated note when the mobile body is empty', () => {
    const draft = buildMobileCaptureDraft({
      body: '   ',
      capturedAt,
      deviceClass: 'ipad',
      draftId: 'note-a',
      kind: 'note',
      source: 'pencil',
    })

    expect(draft.relativePath).toBe('notes/mobile/2026-05-25-note-note-a.md')
    expect(draft.title).toBe('Note 2026-05-25')
    expect(draft.content).toContain('type: Note')
  })

  it('does not put private capture text into title, path, frontmatter title, or H1 before review', () => {
    const privateBody = 'Therapy plan with a private name'
    const draft = buildMobileCaptureDraft({
      body: privateBody,
      capturedAt,
      deviceClass: 'iphone',
      draftId: 'safe-id',
      kind: 'journal',
      source: 'quick-capture',
    })
    const metadataShell = [
      draft.title,
      draft.relativePath,
      draft.content.split('---')[1],
      draft.content.match(/^# .+$/m)?.[0] ?? '',
    ].join('\n')

    expect(metadataShell).not.toContain('Therapy plan')
    expect(metadataShell).not.toContain('private name')
    expect(draft.content).toContain(privateBody)
  })

  it('gives same-day iPhone and iPad captures distinct neutral paths', () => {
    const body = 'Same private body'
    const iphoneDraft = buildMobileCaptureDraft({
      body,
      capturedAt,
      deviceClass: 'iphone',
      draftId: 'iphone-draft',
      kind: 'note',
      source: 'quick-capture',
    })
    const ipadDraft = buildMobileCaptureDraft({
      body,
      capturedAt,
      deviceClass: 'ipad',
      draftId: 'ipad-draft',
      kind: 'note',
      source: 'pencil',
    })

    expect(iphoneDraft.relativePath).not.toBe(ipadDraft.relativePath)
    expect(iphoneDraft.relativePath).not.toContain('Same private body')
    expect(ipadDraft.relativePath).not.toContain('Same private body')
    expect(iphoneDraft.content).toContain('mobile_device: iphone')
    expect(ipadDraft.content).toContain('mobile_device: ipad')
  })

  it('keeps mobile attachment manifests local, reviewable, and path-redacted', () => {
    const draft = buildMobileCaptureDraft(fixtureDraftInput())

    expect(draft.relativePath).toBe(fixture.expected.relativePath)
    expect(draft.captureId).toBe(fixture.expected.mobileCaptureId)
    expect(draft.attachments).toHaveLength(fixture.expected.attachmentCount)
    expect(draft.attachments).toEqual([
      {
        checksum: 'sha256:voice-a',
        kind: 'voice',
        localPath: fixture.input.attachments[0].localPath,
        mimeType: 'audio/mp4',
        name: 'Voice Memo.m4a',
        reviewState: 'pending',
      },
      {
        checksum: 'sha256:image-a',
        kind: 'image',
        localPath: fixture.input.attachments[1].localPath,
        mimeType: 'image/heic',
        name: 'Dream Photo.heic',
        reviewState: 'pending',
      },
      {
        checksum: 'sha256:sketch-a',
        kind: 'sketch',
        localPath: fixture.input.attachments[2].localPath,
        mimeType: 'image/png',
        name: 'Thread sketch.draw',
        reviewState: 'pending',
      },
    ])
    for (const required of fixture.expected.requiredContent) {
      expect(draft.content).toContain(required)
    }
    for (const forbidden of fixture.expected.forbiddenContent) {
      expect(draft.content).not.toContain(forbidden)
    }
    expect(draft.content).not.toContain('sha256:voice-a')
    expect(draft.content).not.toContain('sha256:image-a')
    expect(draft.content).not.toContain('sha256:sketch-a')
  })

  it('uses safe generic attachment names when mobile paths cannot provide one', () => {
    const draft = buildMobileCaptureDraft({
      attachments: [
        { kind: 'transcript', localPath: '' },
        { kind: 'image', localPath: '/tmp/<unsafe>|photo*.png', mimeType: 'image/png' },
      ],
      body: 'Draft with assets',
      capturedAt,
      deviceClass: 'iphone',
      draftId: 'asset-a',
      kind: 'note',
      source: 'camera',
    })

    expect(draft.attachments[0].name).toBe('attachment-1')
    expect(draft.attachments[1].name).toBe('unsafephoto.png')
    expect(draft.content).toContain('attachment_count: 2')
    expect(draft.content).toContain('- [ ] Transcript: attachment-1 - local asset pending review')
    expect(draft.content).toContain('- [ ] Image: unsafephoto.png (image/png) - local asset pending review')
    expect(draft.content).not.toContain('/tmp/')
  })
})

function fixtureDraftInput() {
  return {
    attachments: fixture.input.attachments.map((attachment) => ({
      checksum: attachment.checksum,
      kind: fixtureAttachmentKind(attachment.kind),
      localPath: attachment.localPath,
      mimeType: attachment.mimeType,
      name: 'name' in attachment ? attachment.name : undefined,
    })),
    body: fixture.input.body,
    capturedAt: new Date(fixture.input.capturedAt),
    deviceClass: fixtureDeviceClass(fixture.input.deviceClass),
    draftId: fixture.input.draftId,
    kind: fixtureCaptureKind(fixture.input.kind),
    source: fixtureCaptureSource(fixture.input.source),
  }
}

function fixtureAttachmentKind(value: string): MobileAttachmentKind {
  if (value === 'image' || value === 'sketch' || value === 'transcript' || value === 'voice') return value
  throw new Error(`Unsupported fixture attachment kind: ${value}`)
}

function fixtureCaptureKind(value: string): MobileCaptureKind {
  if (value === 'dream' || value === 'journal' || value === 'memory' || value === 'note' || value === 'task') return value
  throw new Error(`Unsupported fixture capture kind: ${value}`)
}

function fixtureCaptureSource(value: string): MobileCaptureSource {
  if (value === 'camera' || value === 'pencil' || value === 'quick-capture' || value === 'share-extension' || value === 'voice') {
    return value
  }
  throw new Error(`Unsupported fixture capture source: ${value}`)
}

function fixtureDeviceClass(value: string): MobileDeviceClass {
  if (value === 'ipad' || value === 'iphone') return value
  throw new Error(`Unsupported fixture device class: ${value}`)
}
