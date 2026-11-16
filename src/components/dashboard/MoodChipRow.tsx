import type { MoodDistribution, MoodTone } from '../../utils/dashboardModel'
import './MoodChipRow.css'

const MOOD_TONES: { tone: MoodTone; label: string }[] = [
  { tone: 'great', label: 'Great' },
  { tone: 'good', label: 'Good' },
  { tone: 'okay', label: 'Okay' },
  { tone: 'low', label: 'Low' },
  { tone: 'rough', label: 'Rough' },
]

/**
 * One dot per day this week, colored by that day's journal mood. Read-only —
 * tones and date keys only, never journal titles.
 */
export function MoodChipRow({ distribution }: { distribution: MoodDistribution }) {
  return (
    <div className="mood-strip" data-testid="dashboard-mood-strip">
      <div className="mood-strip__dots" role="list" aria-label="Mood by day this week">
        {distribution.days.map((day) => (
          <span
            key={day.dateKey}
            role="listitem"
            className="mood-strip__dot"
            data-testid={`mood-dot-${day.dateKey}`}
            data-today={day.isToday ? 'true' : undefined}
            data-tone={day.mood ?? 'none'}
            title={`${day.dateKey}${day.mood ? ` · ${day.mood}` : ''}`}
            aria-label={`${day.mood ?? 'no mood'} on ${day.dateKey}`}
          />
        ))}
      </div>
      <div className="mood-strip__legend" aria-hidden="true">
        {MOOD_TONES.map(({ tone, label }) => (
          <span key={tone} className="mood-strip__legend-item" data-tone={tone}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
