import type { Page } from '@playwright/test'

const CLAUDE_CODE_ONBOARDING_DISMISSED_KEY = 'grimoire:claude-code-onboarding-dismissed'

type FixtureCommandArgs = Record<string, unknown> | undefined

interface FixtureVaultPageArgs {
  page: Page
  vaultPath: string
}

export async function installFixtureVaultInitScript({ page, vaultPath }: FixtureVaultPageArgs): Promise<void> {
  await page.addInitScript(({ dismissedKey, resolvedVaultPath }: { dismissedKey: string; resolvedVaultPath: string }) => {
    localStorage.clear()
    localStorage.setItem(dismissedKey, '1')

    const jsonHeaders = { 'Content-Type': 'application/json' }
    const FRONTMATTER_OPEN = '---\n'
    const FRONTMATTER_CLOSE = '\n---\n'
    const nativeFetch = window.fetch.bind(window)

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : input.toString()

      if (requestUrl.endsWith('/api/vault/ping') || requestUrl.includes('/api/vault/ping?')) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }

      return nativeFetch(input, init)
    }

    const readJson = async (url: string, init?: RequestInit) => {
      const response = await nativeFetch(url, init)
      if (!response.ok) {
        let message = `HTTP ${response.status}`
        try {
          const body = await response.json() as { error?: string }
          message = body.error ?? message
        } catch {
          // Preserve the HTTP status fallback when the body is not JSON.
        }
        throw new Error(message)
      }
      return response.json()
    }

    const splitFrontmatter = (content: string) => {
      if (!content.startsWith(FRONTMATTER_OPEN)) {
        return { frontmatter: null as string | null, body: content }
      }

      const closeIndex = content.indexOf(FRONTMATTER_CLOSE, FRONTMATTER_OPEN.length)
      if (closeIndex === -1) {
        return { frontmatter: null as string | null, body: content }
      }

      return {
        frontmatter: content.slice(FRONTMATTER_OPEN.length, closeIndex),
        body: content.slice(closeIndex + FRONTMATTER_CLOSE.length),
      }
    }

    const splitFrontmatterEntries = (frontmatter: string) => {
      const lines = frontmatter.split('\n')
      const entries: Array<{ key: string; lines: string[] }> = []
      let current: { key: string; lines: string[] } | null = null

      for (const line of lines) {
        const match = line.match(/^([^:\n]+):(.*)$/)
        if (match && !line.startsWith(' ')) {
          if (current) entries.push(current)
          current = { key: match[1].trim(), lines: [line] }
          continue
        }

        if (current) {
          current.lines.push(line)
        } else if (line.trim() !== '') {
          current = { key: '', lines: [line] }
        }
      }

      if (current) entries.push(current)
      return entries
    }

    const serializeFrontmatterValue = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        if (value.length === 0) return ['[]']
        return [''].concat(value.map((item) => `  - ${JSON.stringify(String(item))}`))
      }
      if (typeof value === 'boolean' || typeof value === 'number') {
        return [String(value)]
      }
      return [JSON.stringify(String(value ?? ''))]
    }

    const replaceFrontmatterEntry = (content: string, key: string, value: unknown) => {
      const { frontmatter, body } = splitFrontmatter(content)
      const entryLines = serializeFrontmatterValue(value)
      const nextEntryLines =
        entryLines[0] === ''
          ? [`${key}:`, ...entryLines.slice(1)]
          : [`${key}: ${entryLines[0]}`]

      if (frontmatter === null) {
        return `${FRONTMATTER_OPEN}${nextEntryLines.join('\n')}${FRONTMATTER_CLOSE}${body}`
      }

      const nextEntries = splitFrontmatterEntries(frontmatter)
        .filter((entry) => entry.key !== '')
        .map((entry) => (entry.key === key ? { key, lines: nextEntryLines } : entry))

      const hasEntry = nextEntries.some((entry) => entry.key === key)
      if (!hasEntry) {
        nextEntries.push({ key, lines: nextEntryLines })
      }

      return `${FRONTMATTER_OPEN}${nextEntries.flatMap((entry) => entry.lines).join('\n')}${FRONTMATTER_CLOSE}${body}`
    }

    const removeFrontmatterEntry = (content: string, key: string) => {
      const { frontmatter, body } = splitFrontmatter(content)
      if (frontmatter === null) return content

      const nextEntries = splitFrontmatterEntries(frontmatter)
        .filter((entry) => entry.key !== '' && entry.key !== key)

      if (nextEntries.length === 0) {
        return body
      }

      return `${FRONTMATTER_OPEN}${nextEntries.flatMap((entry) => entry.lines).join('\n')}${FRONTMATTER_CLOSE}${body}`
    }

    const persistFrontmatterChange = async (notePath: string, transform: (content: string) => string) => {
      const current = await readJson(
        `/api/vault/content?path=${encodeURIComponent(notePath)}`,
      ) as { content: string }
      const updatedContent = transform(current.content)
      await readJson('/api/vault/save', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ path: notePath, content: updatedContent }),
      })
      return updatedContent
    }

    const activeVaultList = {
      vaults: [{ label: 'Test Vault', path: resolvedVaultPath }],
      active_vault: resolvedVaultPath,
      hidden_defaults: [],
    }

    const readVaultList = (commandArgs?: Record<string, unknown>, reload = false) => {
      const resolvedPath = String(commandArgs?.path ?? resolvedVaultPath)
      return readJson(
        `/api/vault/list?path=${encodeURIComponent(resolvedPath)}&reload=${reload ? '1' : '0'}`,
      )
    }

    const renameNoteRequest = (payload: Record<string, unknown>) =>
      readJson('/api/vault/rename', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      })

    const readCommandValue = (commandArgs: FixtureCommandArgs, key: string, fallback?: unknown) =>
      commandArgs?.[key] ?? fallback

    const readCommandString = (commandArgs: FixtureCommandArgs, key: string, fallback = '') =>
      String(readCommandValue(commandArgs, key, fallback))

    const buildFixtureStateHandlers = () => ({
      load_vault_list: () => activeVaultList,
      check_vault_exists: (commandArgs?: FixtureCommandArgs) =>
        readCommandString(commandArgs, 'path') === resolvedVaultPath,
      is_git_repo: () => true,
      get_last_vault_path: () => resolvedVaultPath,
      get_default_vault_path: () => resolvedVaultPath,
      save_vault_list: () => null,
      save_settings: () => null,
      register_mcp_tools: () => null,
      reinit_telemetry: () => null,
      update_menu_state: () => null,
      get_settings: () => ({
        auto_pull_interval_minutes: 5,
        telemetry_consent: false,
        crash_reporting_enabled: null,
        analytics_enabled: null,
        anonymous_id: null,
        release_channel: null,
      }),
    })

    const buildFixtureReadHandlers = () => ({
      list_vault: (commandArgs?: FixtureCommandArgs) => readVaultList(commandArgs),
      reload_vault: (commandArgs?: FixtureCommandArgs) => readVaultList(commandArgs, true),
      list_vault_folders: () => [],
      list_views: () => [],
      get_modified_files: () => [],
      detect_renames: () => [],
      reload_vault_entry: (commandArgs?: FixtureCommandArgs) =>
        readJson(`/api/vault/entry?path=${encodeURIComponent(readCommandString(commandArgs, 'path'))}`),
      get_note_content: async (commandArgs?: FixtureCommandArgs) => {
        const data = await readJson(
          `/api/vault/content?path=${encodeURIComponent(readCommandString(commandArgs, 'path'))}`,
        ) as { content: string }
        return data.content
      },
      get_all_content: (commandArgs?: FixtureCommandArgs) =>
        readJson(
          `/api/vault/all-content?path=${encodeURIComponent(readCommandString(commandArgs, 'path', resolvedVaultPath))}`,
        ),
      search_vault: (commandArgs?: FixtureCommandArgs) => {
        const resolvedPath = readCommandString(
          commandArgs,
          'path',
          readCommandValue(commandArgs, 'vaultPath', resolvedVaultPath),
        )
        const query = encodeURIComponent(readCommandString(commandArgs, 'query'))
        const mode = encodeURIComponent(readCommandString(commandArgs, 'mode', 'all'))
        return readJson(
          `/api/vault/search?vault_path=${encodeURIComponent(resolvedPath)}&query=${query}&mode=${mode}`,
        )
      },
    })

    const buildFixtureWriteHandlers = () => ({
      save_note_content: (commandArgs?: FixtureCommandArgs) =>
        readJson('/api/vault/save', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            path: readCommandValue(commandArgs, 'path'),
            content: readCommandValue(commandArgs, 'content'),
          }),
        }),
      create_note_content: async (commandArgs?: FixtureCommandArgs) => {
        const notePath = readCommandString(commandArgs, 'path')
        const existing = await nativeFetch(`/api/vault/content?path=${encodeURIComponent(notePath)}`)
        if (existing.ok) throw new Error(`File already exists: ${notePath}`)
        return readJson('/api/vault/save', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            path: notePath,
            content: readCommandValue(commandArgs, 'content'),
          }),
        })
      },
      update_frontmatter: (commandArgs?: FixtureCommandArgs) =>
        persistFrontmatterChange(readCommandString(commandArgs, 'path'), (content) =>
          replaceFrontmatterEntry(
            content,
            readCommandString(commandArgs, 'key'),
            readCommandValue(commandArgs, 'value'),
          ),
        ),
      delete_frontmatter_property: (commandArgs?: FixtureCommandArgs) =>
        persistFrontmatterChange(
          readCommandString(commandArgs, 'path'),
          (content) => removeFrontmatterEntry(content, readCommandString(commandArgs, 'key')),
        ),
      rename_note: (commandArgs?: FixtureCommandArgs) =>
        renameNoteRequest({
          vault_path: readCommandValue(commandArgs, 'vaultPath', resolvedVaultPath),
          old_path: readCommandValue(commandArgs, 'oldPath'),
          new_title: readCommandValue(commandArgs, 'newTitle'),
          old_title: readCommandValue(commandArgs, 'oldTitle', null),
        }),
      rename_note_filename: (commandArgs?: FixtureCommandArgs) =>
        readJson('/api/vault/rename-filename', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            vault_path: readCommandValue(commandArgs, 'vaultPath', resolvedVaultPath),
            old_path: readCommandValue(commandArgs, 'oldPath'),
            new_filename_stem: readCommandValue(commandArgs, 'newFilenameStem'),
          }),
        }),
      auto_rename_untitled: async (commandArgs?: FixtureCommandArgs) => {
        const notePath = readCommandString(commandArgs, 'notePath')
        const contentData = await readJson(
          `/api/vault/content?path=${encodeURIComponent(notePath)}`,
        ) as { content: string }
        const match = contentData.content.match(/^#\s+(.+)$/m)
        if (!match) return null
        return renameNoteRequest({
          vault_path: readCommandValue(commandArgs, 'vaultPath', resolvedVaultPath),
          old_path: notePath,
          new_title: match[1].trim(),
        })
      },
    })

    const applyFixtureVaultOverrides = (
      handlers: Record<string, ((args?: unknown) => unknown)> | null | undefined,
    ) => {
      if (!handlers) return handlers
      Object.assign(
        handlers,
        buildFixtureStateHandlers(),
        buildFixtureReadHandlers(),
        buildFixtureWriteHandlers(),
      )
      return handlers
    }

    let ref = applyFixtureVaultOverrides(
      (window.__mockHandlers as Record<string, ((args?: unknown) => unknown)> | undefined),
    ) ?? null

    Object.defineProperty(window, '__mockHandlers', {
      configurable: true,
      set(value) {
        ref = applyFixtureVaultOverrides(
          value as Record<string, ((args?: unknown) => unknown)> | undefined,
        ) ?? null
      },
      get() {
        return applyFixtureVaultOverrides(ref) ?? ref
      },
    })
  }, { dismissedKey: CLAUDE_CODE_ONBOARDING_DISMISSED_KEY, resolvedVaultPath: vaultPath })
}
