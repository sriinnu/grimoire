type CapsuleFormat = 'json' | 'sqlite'

interface ExportPathArgs {
  targetPath?: string
}

interface CapsuleArgs extends ExportPathArgs {
  format?: CapsuleFormat
}

function defaultCapsulePath(format: CapsuleFormat | undefined): string {
  return `/Users/mock/Desktop/grimoire-vault.${format === 'sqlite' ? 'sqlite' : 'json'}`
}

/** Browser fallback handlers for local export and portability capsule commands. */
export const mockExportHandlers = {
  export_markdown_zip: (args: ExportPathArgs) => ({
    export_path: args.targetPath ?? '/Users/mock/Desktop/grimoire-vault.zip',
    files_exported: 12,
    skipped_files: 0,
  }),
  export_static_html_archive: (args: ExportPathArgs) => ({
    export_path: args.targetPath ?? '/Users/mock/Desktop/grimoire-html-archive',
    files_exported: 10,
    skipped_files: 2,
  }),
  preview_portability_capsule: (args: CapsuleArgs) => ({
    format: args.format ?? 'json',
    files_exportable: 12,
    notes_exportable: 8,
    assets_exportable: 4,
    skipped_files: 2,
    bytes_exportable: 32768,
    locality_proof: {
      markdown_source_of_truth: true,
      absolute_source_paths_redacted: true,
      local_only_files_withheld: 2,
    },
    manifest_rows: [
      { kind: 'markdown', path: 'Notes/public.md', bytes: 128, sha256: 'mock' },
      { kind: 'withheld', path: 'Journal/private.md', bytes: 0, reason: 'Protected by Locality Firewall' },
    ],
  }),
  export_portability_capsule: (args: CapsuleArgs) => ({
    export_path: args.targetPath ?? defaultCapsulePath(args.format),
    files_exported: 12,
    skipped_files: 2,
  }),
}
