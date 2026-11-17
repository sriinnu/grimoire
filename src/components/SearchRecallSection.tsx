import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SearchRecallState } from '../hooks/useUnifiedSearch'
import { createTranslator, type AppLocale } from '../lib/i18n'

interface SearchRecallSectionProps {
  recall: SearchRecallState
  locale?: AppLocale
}

/**
 * Deep-recall output for the search panel: the agent-backed memories that
 * accompany keyword results in 'hybrid' mode. Question and vault path went to
 * the seam; note bodies never do. Rendered above the keyword result list.
 */
export function SearchRecallSection({ recall, locale = 'en' }: SearchRecallSectionProps) {
  const t = createTranslator(locale)
  const { status, attachment } = recall
  if (status === 'ready' && !attachment) return null

  const items = attachment?.items ?? []
  const recalledCount = attachment?.recalledCount ?? 0
  return (
    <section
      className="search-recall grimoire-context-surface grid gap-2 rounded-md border p-2.5"
      data-testid="search-recall"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-foreground" />
        <span className="grimoire-context-label text-xs font-semibold">{t('search.recall.title')}</span>
        {attachment && recalledCount > 0 ? (
          <Badge
            variant="secondary"
            className="grimoire-context-pill ml-auto rounded-md text-[10px] font-semibold"
            data-tone="active"
          >
            {recalledCount} {recalledCount === 1 ? t('search.recall.memory') : t('search.recall.memories')}
          </Badge>
        ) : null}
        {attachment?.degraded ? (
          <Badge
            variant="outline"
            className="grimoire-context-pill rounded-md text-[10px] font-semibold"
            data-tone="warning"
          >
            {t('search.recall.degraded')}
          </Badge>
        ) : null}
      </div>

      {status === 'loading' ? (
        <p className="grimoire-context-secondary text-[11px] leading-4" role="status">
          {t('search.recall.loading')}
        </p>
      ) : null}

      {status === 'unavailable' ? (
        <p className="search-recall__footnote text-[11px] leading-4" role="status">
          {t('search.recall.unavailable')}
        </p>
      ) : null}

      {attachment?.guidance ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">{attachment.guidance}</p>
      ) : null}

      {attachment && items.length === 0 && status === 'ready' ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">{t('search.recall.empty')}</p>
      ) : null}

      {items.map((item, index) => (
        <div key={`${item.primarySource ?? 'memory'}:${index}`} className="grid gap-0.5">
          <p className="grimoire-context-label text-[11px] leading-4">{item.answer}</p>
          {item.snippet ? (
            <p className="grimoire-context-secondary text-[10px] leading-4">{item.snippet}</p>
          ) : null}
          {item.primarySource ? (
            <p className="grimoire-context-secondary text-[10px] leading-4">{item.primarySource}</p>
          ) : null}
        </div>
      ))}

      {attachment?.degraded && attachment.warnings[0] ? (
        <p className="grimoire-context-secondary text-[10px] leading-4">{attachment.warnings[0]}</p>
      ) : null}

      <p className="grimoire-context-secondary text-[10px] leading-4">{t('search.recall.privacy')}</p>
    </section>
  )
}
