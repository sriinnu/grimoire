interface SourceLabelItem {
  path: string
  title: string
}

/** Builds stable, source-safe labels and disambiguates duplicate note titles by path. */
export function buildSourceLabels(items: readonly SourceLabelItem[]): string[] {
  return [...buildSourceLabelMap(items).values()]
}

/** Maps each source path to the label shown in prompts and package manifests. */
export function buildSourceLabelMap(items: readonly SourceLabelItem[]): Map<string, string> {
  const duplicateTitles = duplicateTitleSet(items)
  const labels = new Map<string, string>()

  for (const item of items) {
    if (!labels.has(item.path)) labels.set(item.path, sourceLabel(item, duplicateTitles))
  }

  return labels
}

function duplicateTitleSet(items: readonly SourceLabelItem[]): Set<string> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = normalizeTitle(item.title)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return new Set([...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([title]) => title))
}

function sourceLabel(item: SourceLabelItem, duplicateTitles: Set<string>): string {
  const title = item.title.trim() || compactSourcePath(item.path)
  if (!duplicateTitles.has(normalizeTitle(item.title))) return title
  return `${title} - ${compactSourcePath(item.path)}`
}

function compactSourcePath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return path
  return parts.slice(-2).join('/')
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase()
}
