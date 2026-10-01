import type { GitCommit } from '../../types'

function formatRelativeCommitDate(timestamp: number, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const days = Math.floor((nowSeconds - timestamp) / 86400)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1mo ago' : `${months}mo ago`
  const years = Math.floor(months / 12)
  return years === 1 ? '1y ago' : `${years}y ago`
}

/** Edits as a timeline: when, then what. The hash is in the tooltip; clicking opens the diff. */
export function GitHistoryPanel({ commits, onViewCommitDiff }: { commits: GitCommit[]; onViewCommitDiff?: (commitHash: string) => void }) {
  if (commits.length === 0) return null

  return (
    <ol className="git-timeline" data-testid="git-timeline" aria-label="Edits">
      {commits.map((commit) => (
        <li key={commit.hash} className="git-timeline__item">
          <button
            type="button"
            className="git-timeline__commit"
            onClick={() => onViewCommitDiff?.(commit.hash)}
            title={`${commit.shortHash} · view diff`}
            disabled={!onViewCommitDiff}
          >
            <span className="git-timeline__when">{formatRelativeCommitDate(commit.date)}</span>
            <span className="git-timeline__message">{commit.message}</span>
            <span className="git-timeline__hash">{commit.shortHash}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
