import { RELEASE_HISTORY_PAGE_SCRIPT, RELEASE_HISTORY_PAGE_STYLES } from './releaseHistoryPageAssets'

type ReleaseAssetPayload = {
  browser_download_url?: unknown
  name?: unknown
}

type GitHubReleasePayload = {
  assets?: ReleaseAssetPayload[]
  body?: unknown
  body_html?: unknown
  draft?: unknown
  html_url?: unknown
  name?: unknown
  prerelease?: unknown
  published_at?: unknown
  tag_name?: unknown
}

type ReleaseChannel = 'stable' | 'alpha'

type ReleaseDownload = {
  label: string
  url: string
}

type ReleaseEntry = {
  downloads: ReleaseDownload[]
  githubUrl: string | null
  notesHtml: string
  publishedLabel: string
  publishedTimestamp: number
  tagName: string
  title: string
}

type ReleaseSections = Record<ReleaseChannel, ReleaseEntry[]>

const RELEASE_CHANNEL_LABELS: Record<ReleaseChannel, string> = {
  alpha: 'Alpha',
  stable: 'Stable',
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function normalizeUrl(value: unknown): string | null {
  const text = normalizeText(value)
  if (text === null) return null

  try {
    const parsedUrl = new URL(text)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return null
    return parsedUrl.toString()
  } catch {
    return null
  }
}

function formatPublishedLabel(value: unknown): string {
  const text = normalizeText(value)
  if (text === null) return 'Unknown publish date'

  const publishedAt = new Date(text)
  if (Number.isNaN(publishedAt.getTime())) return 'Unknown publish date'

  return publishedAt.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  })
}

function parsePublishedTimestamp(value: unknown): number {
  const text = normalizeText(value)
  if (text === null) return Number.NEGATIVE_INFINITY

  const publishedAt = new Date(text)
  const timestamp = publishedAt.getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

function isDownloadableAsset(name: string): boolean {
  return (
    name.endsWith('.dmg')
    || name.endsWith('.app.tar.gz')
    || name.endsWith('-setup.exe')
    || name.endsWith('.msi')
    || name.endsWith('.AppImage')
    || name.endsWith('.deb')
  )
}

function normalizeDownloads(assets: ReleaseAssetPayload[] | undefined): ReleaseDownload[] {
  if (!Array.isArray(assets)) return []

  const seenUrls = new Set<string>()
  const downloads: ReleaseDownload[] = []

  for (const asset of assets) {
    const name = normalizeText(asset.name)
    const url = normalizeUrl(asset.browser_download_url)
    if (name === null || url === null || !isDownloadableAsset(name) || seenUrls.has(url)) continue

    seenUrls.add(url)
    downloads.push({ label: name, url })
  }

  return downloads
}

function buildFallbackReleaseNotesHtml(markdownFallback: string): string {
  const paragraphs = markdownFallback
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => `<p>${escapeHtml(part).replaceAll('\n', '<br>')}</p>`)

  return paragraphs.join('')
}

function resolveReleaseNotesHtml(renderedHtml: unknown, markdownFallback: unknown): string {
  const bodyHtml = normalizeText(renderedHtml)
  if (bodyHtml !== null) return bodyHtml

  const fallback = normalizeText(markdownFallback) ?? 'No release notes provided.'
  return buildFallbackReleaseNotesHtml(fallback)
}

function normalizeReleaseEntry(release: GitHubReleasePayload): [ReleaseChannel, ReleaseEntry] | null {
  if (release.draft === true) return null

  const title = normalizeText(release.name) ?? normalizeText(release.tag_name) ?? 'Untitled release'
  const tagName = normalizeText(release.tag_name) ?? 'Unknown tag'
  const channel: ReleaseChannel = release.prerelease === true ? 'alpha' : 'stable'

  return [channel, {
    downloads: normalizeDownloads(release.assets),
    githubUrl: normalizeUrl(release.html_url),
    notesHtml: resolveReleaseNotesHtml(release.body_html, release.body),
    publishedLabel: formatPublishedLabel(release.published_at),
    publishedTimestamp: parsePublishedTimestamp(release.published_at),
    tagName,
    title,
  }]
}

function collectReleaseSections(payload: unknown): ReleaseSections {
  const sections: ReleaseSections = { alpha: [], stable: [] }
  if (!Array.isArray(payload)) return sections

  for (const item of payload) {
    if (!item || typeof item !== 'object') continue

    const normalizedRelease = normalizeReleaseEntry(item as GitHubReleasePayload)
    if (normalizedRelease === null) continue

    const [channel, release] = normalizedRelease
    sections[channel].push(release)
  }

  for (const channel of ['stable', 'alpha'] as const) {
    sections[channel].sort((left, right) => right.publishedTimestamp - left.publishedTimestamp)
  }

  return sections
}

function buildTabMarkup(channel: ReleaseChannel, count: number, selected: boolean): string {
  const label = RELEASE_CHANNEL_LABELS[channel]
  return `
      <button
        id="tab-${channel}"
        class="channel-tab"
        type="button"
        role="tab"
        aria-controls="panel-${channel}"
        aria-selected="${selected}"
        data-release-tab="${channel}"
        tabindex="${selected ? '0' : '-1'}"
      >
        ${label}<span class="tab-count">${count}</span>
      </button>`
}

function buildReleaseMarkup(channel: ReleaseChannel, release: ReleaseEntry): string {
  const downloads = [...release.downloads]
  if (release.githubUrl !== null) {
    downloads.push({ label: 'View on GitHub', url: release.githubUrl })
  }

  const channelLabel = RELEASE_CHANNEL_LABELS[channel]
  const downloadsMarkup = downloads.length > 0
    ? `
      <div class="release-downloads">
        ${downloads.map(download => {
          const isSecondary = download.label === 'View on GitHub'
          return `<a href="${escapeHtml(download.url)}" ${isSecondary ? 'data-secondary="true" ' : ''}target="_blank" rel="noreferrer">${escapeHtml(download.label)}</a>`
        }).join('')}
      </div>`
    : ''

  return `
      <article class="release-card release-card--${channel}">
        <div class="release-header">
          <div>
            <h2>${escapeHtml(release.title)}</h2>
            <p class="release-meta">${escapeHtml(release.publishedLabel)} · ${escapeHtml(release.tagName)}</p>
          </div>
          <span class="release-channel">${channelLabel}</span>
        </div>
        <div class="release-notes">${release.notesHtml}</div>${downloadsMarkup}
      </article>`
}

function buildPanelMarkup(channel: ReleaseChannel, releases: ReleaseEntry[], selected: boolean): string {
  const releasesMarkup = releases.length > 0
    ? releases.map(release => buildReleaseMarkup(channel, release)).join('')
    : `<div class="empty-state">No ${channel} releases published yet.</div>`

  return `
    <section
      id="panel-${channel}"
      class="release-panel"
      role="tabpanel"
      tabindex="0"
      aria-labelledby="tab-${channel}"
      data-release-panel="${channel}"${selected ? '' : ' hidden'}
    >
      ${releasesMarkup}
    </section>`
}

export function buildReleaseHistoryPage(releasesPayload: unknown): string {
  const sections = collectReleaseSections(releasesPayload)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grimoire — Release History</title>
  <style>${RELEASE_HISTORY_PAGE_STYLES}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Grimoire Release History</h1>
      <p class="subtitle">Stable builds appear when a stable-vYYYY.M.D tag is promoted. Alpha builds update on every push to main.</p>
      <p class="keyboard-hint">Use Tab to reach the channel picker, then use the arrow keys to switch between Stable and Alpha.</p>
    </header>
    <div class="channel-tabs">
      <div class="channel-tablist" role="tablist" aria-label="Release channels">
        ${buildTabMarkup('stable', sections.stable.length, true)}
        ${buildTabMarkup('alpha', sections.alpha.length, false)}
      </div>
    </div>
    ${buildPanelMarkup('stable', sections.stable, true)}
    ${buildPanelMarkup('alpha', sections.alpha, false)}
  </main>
  <script>${RELEASE_HISTORY_PAGE_SCRIPT}
  </script>
</body>
</html>
`
}
