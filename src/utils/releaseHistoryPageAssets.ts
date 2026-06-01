/** Standalone CSS embedded into the generated release-history HTML. */
export const RELEASE_HISTORY_PAGE_STYLES = `
    :root {
      color-scheme: light dark;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --release-surface-page: #f7f6f3;
      --release-surface-card: #ffffff;
      --release-surface-muted: #f4f4f2;
      --release-surface-tab-hover: rgba(21, 93, 255, 0.06);
      --release-surface-secondary-action: #ebeef5;
      --release-text-primary: #37352f;
      --release-text-secondary: #787774;
      --release-text-muted: #5e5c57;
      --release-text-body: #44403c;
      --release-text-blockquote: #57534e;
      --release-text-on-accent: #ffffff;
      --release-border-default: #e9e9e7;
      --release-border-strong: #d6d3d1;
      --release-border-accent: #d8e3ff;
      --release-accent: #155dff;
      --release-alpha: #f59e0b;
      --release-alpha-bg: #fff3d6;
      --release-alpha-text: #b45309;
      --release-shadow-card: rgba(15, 23, 42, 0.05);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --release-surface-page: #1f1e1b;
        --release-surface-card: #23221f;
        --release-surface-muted: #2d2b27;
        --release-surface-tab-hover: rgba(120, 164, 255, 0.16);
        --release-surface-secondary-action: #34322d;
        --release-text-primary: #e6e1d8;
        --release-text-secondary: #b8b1a6;
        --release-text-muted: #c8c1b6;
        --release-text-body: #d8d1c6;
        --release-text-blockquote: #b8b1a6;
        --release-text-on-accent: #151411;
        --release-border-default: #34322d;
        --release-border-strong: #46433b;
        --release-border-accent: #25415f;
        --release-accent: #78a4ff;
        --release-alpha: #f3a15b;
        --release-alpha-bg: rgba(243, 161, 91, 0.17);
        --release-alpha-text: #f3c27f;
        --release-shadow-card: rgba(0, 0, 0, 0.35);
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--release-surface-page);
      color: var(--release-text-primary);
      padding: 32px 20px 48px;
    }

    main {
      width: min(100%, 840px);
      margin: 0 auto;
    }

    header {
      margin-bottom: 24px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 4vw, 2.5rem);
      line-height: 1.1;
    }

    .subtitle,
    .keyboard-hint {
      margin: 0;
      color: var(--release-text-secondary);
      line-height: 1.6;
    }

    .keyboard-hint {
      margin-top: 8px;
      font-size: 0.9375rem;
    }

    .channel-tabs {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--release-border-default);
    }

    .channel-tablist {
      display: inline-flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: -1px;
    }

    .channel-tab {
      appearance: none;
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 12px 12px 0 0;
      background: transparent;
      color: var(--release-text-muted);
      cursor: pointer;
      font: inherit;
      font-weight: 600;
      padding: 12px 16px;
    }

    .channel-tab:hover {
      background: var(--release-surface-tab-hover);
      color: var(--release-accent);
    }

    .channel-tab:focus-visible {
      outline: 2px solid var(--release-accent);
      outline-offset: 2px;
    }

    .channel-tab[aria-selected="true"] {
      background: var(--release-surface-card);
      border-color: var(--release-border-accent);
      color: var(--release-accent);
      box-shadow: 0 -1px 0 var(--release-surface-card) inset;
    }

    .tab-count {
      color: var(--release-text-secondary);
      font-weight: 500;
      margin-left: 6px;
    }

    .release-panel {
      display: grid;
      gap: 16px;
      outline: none;
    }

    .release-panel[hidden] {
      display: none;
    }

    .release-card {
      background: var(--release-surface-card);
      border: 1px solid var(--release-border-default);
      border-radius: 18px;
      padding: 20px 22px;
      box-shadow: 0 16px 40px var(--release-shadow-card);
    }

    .release-card--alpha {
      border-left: 4px solid var(--release-alpha);
    }

    .release-card--stable {
      border-left: 4px solid var(--release-accent);
    }

    .release-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .release-header h2 {
      margin: 0;
      font-size: 1.25rem;
      line-height: 1.25;
    }

    .release-meta {
      margin: 4px 0 0;
      color: var(--release-text-secondary);
      font-size: 0.9375rem;
    }

    .release-channel {
      align-self: start;
      background: var(--release-surface-tab-hover);
      border-radius: 999px;
      color: var(--release-accent);
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      padding: 6px 10px;
      text-transform: uppercase;
    }

    .release-card--alpha .release-channel {
      background: var(--release-alpha-bg);
      color: var(--release-alpha-text);
    }

    .release-notes {
      color: var(--release-text-body);
      font-size: 0.98rem;
      line-height: 1.7;
    }

    .release-notes > :first-child {
      margin-top: 0;
    }

    .release-notes > :last-child {
      margin-bottom: 0;
    }

    .release-notes h1,
    .release-notes h2,
    .release-notes h3 {
      line-height: 1.25;
      margin: 1.2em 0 0.4em;
    }

    .release-notes p,
    .release-notes ul,
    .release-notes ol,
    .release-notes blockquote,
    .release-notes pre {
      margin: 0 0 1em;
    }

    .release-notes ul,
    .release-notes ol {
      padding-left: 1.4rem;
    }

    .release-notes code {
      background: var(--release-surface-muted);
      border-radius: 6px;
      padding: 0.12em 0.35em;
    }

    .release-notes pre {
      overflow-x: auto;
      background: var(--release-surface-muted);
      border-radius: 12px;
      padding: 14px;
    }

    .release-notes pre code {
      background: transparent;
      padding: 0;
    }

    .release-notes blockquote {
      border-left: 3px solid var(--release-border-strong);
      color: var(--release-text-blockquote);
      padding-left: 14px;
    }

    .release-notes a,
    .release-downloads a {
      color: var(--release-accent);
      text-decoration-thickness: 0.08em;
      text-underline-offset: 0.18em;
    }

    .release-downloads {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .release-downloads a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 14px;
      border-radius: 10px;
      background: var(--release-accent);
      color: var(--release-text-on-accent);
      font-weight: 600;
      text-decoration: none;
    }

    .release-downloads a[data-secondary="true"] {
      background: var(--release-surface-secondary-action);
      color: var(--release-text-primary);
    }

    .release-downloads a:hover,
    .release-downloads a:focus-visible {
      filter: brightness(0.96);
    }

    .release-downloads a:focus-visible {
      outline: 2px solid var(--release-accent);
      outline-offset: 2px;
    }

    .empty-state {
      background: var(--release-surface-card);
      border: 1px dashed var(--release-border-strong);
      border-radius: 18px;
      color: var(--release-text-secondary);
      padding: 28px 24px;
      text-align: center;
    }

    @media (max-width: 640px) {
      body {
        padding-inline: 16px;
      }

      .release-card {
        padding: 18px;
      }

      .channel-tablist {
        width: 100%;
      }

      .channel-tab {
        flex: 1 1 180px;
        text-align: center;
      }
    }
`


/** Standalone JavaScript that powers accessible release-channel tabs. */
export const RELEASE_HISTORY_PAGE_SCRIPT = `
    (() => {
      const tabs = Array.from(document.querySelectorAll('[data-release-tab]'));
      const panels = Array.from(document.querySelectorAll('[data-release-panel]'));
      if (!tabs.length || !panels.length) return;

      const activateTab = (nextTab) => {
        const nextChannel = nextTab.getAttribute('data-release-tab');
        tabs.forEach((tab) => {
          const selected = tab === nextTab;
          tab.setAttribute('aria-selected', String(selected));
          tab.tabIndex = selected ? 0 : -1;
        });
        panels.forEach((panel) => {
          panel.hidden = panel.getAttribute('data-release-panel') !== nextChannel;
        });
      };

      const moveFocus = (currentIndex, offset) => {
        const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex]);
      };

      const activateFocusedTab = (tab) => {
        tab.focus();
        activateTab(tab);
      };

      const handleTabKeydown = (event, tab, index) => {
        const keyActions = {
          ' ': () => activateTab(tab),
          ArrowDown: () => moveFocus(index, 1),
          ArrowLeft: () => moveFocus(index, -1),
          ArrowRight: () => moveFocus(index, 1),
          ArrowUp: () => moveFocus(index, -1),
          End: () => activateFocusedTab(tabs[tabs.length - 1]),
          Enter: () => activateTab(tab),
          Home: () => activateFocusedTab(tabs[0]),
        };
        const action = keyActions[event.key];
        if (!action) return;

        event.preventDefault();
        action();
      };

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab));
        tab.addEventListener('keydown', (event) => handleTabKeydown(event, tab, index));
      });
    })();
`
