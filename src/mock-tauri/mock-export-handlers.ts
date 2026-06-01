type CapsuleFormat = 'json' | 'sqlite'

interface ExportPathArgs {
  targetPath?: string
}

interface CapsuleArgs extends ExportPathArgs {
  format?: CapsuleFormat
  previewSignature?: string
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
    preview_signature: `mock-${args.format ?? 'json'}-capsule-preview`,
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
  export_portability_capsule: (args: CapsuleArgs) => {
    if (!args.previewSignature?.trim()) throw new Error('Capsule export requires preview signature')
    return {
      export_path: args.targetPath ?? defaultCapsulePath(args.format),
      files_exported: 12,
      skipped_files: 2,
    }
  },
  run_portability_capsule_loop_proof: (args: CapsuleArgs) => ({
    proof_level: 'local-artifact-loop',
    format: args.format ?? 'json',
    status: 'passed',
    checked_at: new Date(0).toISOString(),
    export_signature_captured: true,
    import_signature_captured: true,
    files_exported: 12,
    notes_exported: 8,
    notes_previewed_for_import: 8,
    assets_exported: 4,
    assets_previewed_for_import: 4,
    local_only_files_withheld: 2,
    local_only_rows_previewed: 2,
    markdown_source_of_truth: true,
    absolute_source_paths_redacted: true,
    local_only_report_planned: true,
    artifact_path_stored: false,
  }),
}
