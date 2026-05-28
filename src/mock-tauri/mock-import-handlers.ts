const DEFAULT_MOCK_VAULT_PATH = '/Users/mock/demo-vault-v2'

interface ImportPathArgs {
  vaultPath?: string
  sourcePath?: string
}

interface ImportKindArgs extends ImportPathArgs {
  sourceKind?: string
}

interface CapsuleImportArgs extends ImportPathArgs {
  format?: 'json' | 'sqlite'
  previewSignature?: string
}

function sourceName(sourcePath: string, fallback: string): string {
  return sourcePath.split('/').filter(Boolean).pop() ?? fallback
}

function sourceNameWithoutZip(sourcePath: string, fallback: string): string {
  return sourceName(sourcePath, fallback).replace(/\.zip$/i, '')
}

function mockImportResult(
  vaultPath: string,
  source: string,
  notes: number,
  assets: number,
  skipped: number,
) {
  return {
    imported_root: `${vaultPath}/imports/${source}`,
    report_path: `${vaultPath}/imports/${source}/import-report.md`,
    notes_copied: notes,
    assets_copied: assets,
    skipped_files: skipped,
    failed_files: 0,
  }
}

function mockImportPreview(vaultPath: string, sourcePath: string, source: string) {
  const isZip = sourcePath.toLowerCase().endsWith('.zip')
  return {
    source_path: sourcePath,
    planned_import_root: `${vaultPath}/imports/${source}`,
    notes_to_copy: isZip ? 5 : 3,
    assets_to_copy: isZip ? 3 : 2,
    skipped_files: 1,
    failed_files: 0,
    writes_local_only_report: true,
  }
}

function mockCapsuleSource(args: CapsuleImportArgs): string {
  if (args.sourcePath) return sourceName(args.sourcePath, 'grimoire-capsule')
  return args.format === 'sqlite' ? 'grimoire-vault.sqlite' : 'grimoire-vault.json'
}

/** Browser fallback handlers for import and Import Autopsy commands. */
export const mockImportHandlers = {
  import_markdown_folder: (args: ImportPathArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = args.sourcePath ?? '/Users/mock/Exports/Bear'
    return mockImportResult(vault, sourceName(source, 'markdown-import'), 3, 2, 1)
  },
  cancel_markdown_folder_import: () => true,
  preview_markdown_folder_import: (args: ImportPathArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = args.sourcePath ?? '/Users/mock/Exports/Bear'
    return mockImportPreview(vault, source, sourceName(source, 'markdown-import'))
  },
  preview_markdown_zip_import: (args: ImportPathArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = args.sourcePath ?? '/Users/mock/Exports/grimoire-vault.zip'
    return mockImportPreview(vault, source, sourceNameWithoutZip(source, 'markdown-zip'))
  },
  import_markdown_zip: (args: ImportPathArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = args.sourcePath ?? '/Users/mock/Exports/grimoire-vault.zip'
    return mockImportResult(vault, sourceNameWithoutZip(source, 'markdown-zip'), 5, 3, 1)
  },
  preview_portability_capsule_import: (args: CapsuleImportArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = mockCapsuleSource(args)
    return {
      ...mockImportPreview(vault, source, source.replace(/\.(json|sqlite|db)$/i, '')),
      preview_signature: `mock-${args.format ?? 'json'}-capsule-import-preview`,
      notes_to_copy: 8,
      assets_to_copy: 4,
      manifest_rows: [
        {
          kind: 'note',
          source_path: `${source}/Notes/public.md`,
          destination_path: `${vault}/imports/${source}/Notes/public.md`,
          detail: 'Grimoire capsule restore; Markdown remains source of truth',
        },
        {
          kind: 'withheld',
          source_path: `${source}/Journal/private.md`,
          destination_path: null,
          detail: 'withheld at export: Protected by Locality Firewall',
        },
      ],
    }
  },
  import_portability_capsule: (args: CapsuleImportArgs) => {
    if (!args.previewSignature?.trim()) throw new Error('Capsule import requires preview signature')
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = mockCapsuleSource(args).replace(/\.(json|sqlite|db)$/i, '')
    return mockImportResult(vault, source, 8, 4, 2)
  },
  import_journal_export: (args: ImportKindArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const kind = args.sourceKind ?? 'day-one'
    return mockImportResult(vault, `${kind}-export`, 8, 4, 0)
  },
  preview_journal_export: (args: ImportKindArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = args.sourcePath ?? '/Users/mock/Exports/Journal'
    const kind = args.sourceKind ?? 'day-one'
    return mockImportPreview(vault, source, `${kind}-export`)
  },
  import_app_export: (args: ImportKindArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const kind = args.sourceKind ?? 'obsidian'
    return mockImportResult(
      vault,
      `${kind}-export`,
      kind === 'spanda' ? 6 : 4,
      kind === 'spanda' ? 1 : 3,
      kind === 'obsidian' ? 2 : 0,
    )
  },
  preview_app_export: (args: ImportKindArgs) => {
    const vault = args.vaultPath ?? DEFAULT_MOCK_VAULT_PATH
    const source = args.sourcePath ?? '/Users/mock/Exports/App'
    const kind = args.sourceKind ?? 'obsidian'
    return mockImportPreview(vault, source, `${kind}-export`)
  },
}
