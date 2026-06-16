import './EditorLoadingState.css'

interface EditorLoadingStateProps {
  detail?: string
  label?: string
}

/** Centered animated SVG loader for editor startup and note-switch transitions. */
export function EditorLoadingState({
  detail = 'Preparing the editor',
  label = 'Loading editor',
}: EditorLoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className="editor-loading"
      data-testid="editor-loading-state"
      role="status"
    >
      <svg
        aria-hidden="true"
        className="editor-loading__mark"
        viewBox="0 0 180 180"
      >
        <defs>
          <linearGradient id="editor-loading-page" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--editor-loading-page-top)" />
            <stop offset="100%" stopColor="var(--editor-loading-page-bottom)" />
          </linearGradient>
          <radialGradient id="editor-loading-glow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="var(--editor-loading-glow-core)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="editor-loading-soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="11" floodColor="var(--editor-loading-shadow)" floodOpacity="0.28" />
          </filter>
        </defs>
        <ellipse className="editor-loading__glow" cx="90" cy="93" fill="url(#editor-loading-glow)" rx="58" ry="45" />
        <ellipse className="editor-loading__shadow" cx="90" cy="143" rx="43" ry="10" />
        <g className="editor-loading__book" filter="url(#editor-loading-soft-shadow)">
          <path
            className="editor-loading__page editor-loading__page--left"
            d="M86 55 C69 47 51 50 38 61 L38 122 C52 113 69 112 86 122 Z"
            fill="url(#editor-loading-page)"
          />
          <path
            className="editor-loading__page editor-loading__page--right"
            d="M94 55 C111 47 129 50 142 61 L142 122 C128 113 111 112 94 122 Z"
            fill="url(#editor-loading-page)"
          />
          <path className="editor-loading__spine" d="M88 55 L92 55 L92 124 L88 124 Z" />
          <path className="editor-loading__line editor-loading__line--one" d="M50 70 C61 66 70 67 80 72" />
          <path className="editor-loading__line editor-loading__line--two" d="M50 84 C62 80 71 81 80 86" />
          <path className="editor-loading__line editor-loading__line--three" d="M101 72 C111 67 121 66 132 70" />
          <path className="editor-loading__line editor-loading__line--four" d="M101 86 C110 81 120 80 132 84" />
          <path className="editor-loading__margin-mark" d="M90 58 L90 121" />
          <path className="editor-loading__thread editor-loading__thread--left" d="M49 104 C61 99 72 100 82 105" />
          <path className="editor-loading__thread editor-loading__thread--right" d="M99 105 C110 100 121 99 133 104" />
          <circle className="editor-loading__page-dot editor-loading__page-dot--left" cx="73" cy="105" r="2.2" />
          <circle className="editor-loading__page-dot editor-loading__page-dot--right" cx="115" cy="105" r="2.2" />
        </g>
      </svg>
      <div className="editor-loading__copy">
        <div className="editor-loading__label">{label}</div>
        <div className="editor-loading__detail">{detail}</div>
      </div>
    </div>
  )
}
