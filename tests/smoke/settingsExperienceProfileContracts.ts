/** Expected visible and token-level behavior for one complete Settings experience profile. */
export type ExperienceProfileContract = {
  canvas: string
  codeBlock: string
  density: string
  editorMaxWidth: string
  graph: string
  heading: string
  id: string
  metadataFields: string
  metadataStrip: string
  mode: 'dark' | 'light'
  motion: string
  shell: string
  shellLabel: string
  traitLabels: string[]
  writing: string
  writingLabel: string
}

/** Curated profiles that must prove shell, writing, graph, canvas, code, density, and motion contracts. */
export const EXPERIENCE_PROFILE_CONTRACTS: ExperienceProfileContract[] = [
  {
    id: 'constellation',
    mode: 'dark',
    density: 'comfortable',
    motion: 'standard',
    graph: 'constellation',
    canvas: 'blueprint',
    codeBlock: 'notebook',
    heading: 'graph',
    metadataStrip: 'badges',
    metadataFields: 'type status owner modified locality',
    editorMaxWidth: '820px',
    shell: 'map',
    shellLabel: 'Map',
    traitLabels: ['Comfortable', 'Standard', 'Constellation', 'Blueprint', 'Notebook'],
    writing: 'graph',
    writingLabel: 'Graph',
  },
  {
    id: 'daylight-notebook',
    mode: 'light',
    density: 'comfortable',
    motion: 'standard',
    graph: 'ledger',
    canvas: 'paper',
    codeBlock: 'plain',
    heading: 'system',
    metadataStrip: 'badges',
    metadataFields: 'type status modified locality',
    editorMaxWidth: '820px',
    shell: 'notebook',
    shellLabel: 'Notebook',
    traitLabels: ['Comfortable', 'Standard', 'Ledger', 'Paper', 'Plain'],
    writing: 'system',
    writingLabel: 'System',
  },
  {
    id: 'morning-notebook',
    mode: 'light',
    density: 'comfortable',
    motion: 'standard',
    graph: 'ledger',
    canvas: 'paper',
    codeBlock: 'notebook',
    heading: 'system',
    metadataStrip: 'badges',
    metadataFields: 'type status modified locality',
    editorMaxWidth: '820px',
    shell: 'notebook',
    shellLabel: 'Notebook',
    traitLabels: ['Comfortable', 'Standard', 'Ledger', 'Paper', 'Notebook'],
    writing: 'system',
    writingLabel: 'System',
  },
  {
    id: 'living-archive',
    mode: 'light',
    density: 'spacious',
    motion: 'calm',
    graph: 'ledger',
    canvas: 'paper',
    codeBlock: 'notebook',
    heading: 'manuscript',
    metadataStrip: 'quiet',
    metadataFields: 'type modified locality',
    editorMaxWidth: '820px',
    shell: 'archive',
    shellLabel: 'Archive',
    traitLabels: ['Spacious', 'Calm', 'Ledger', 'Paper', 'Notebook'],
    writing: 'manuscript',
    writingLabel: 'Manuscript',
  },
  {
    id: 'nocturne',
    mode: 'dark',
    density: 'comfortable',
    motion: 'calm',
    graph: 'ledger',
    canvas: 'paper',
    codeBlock: 'plain',
    heading: 'system',
    metadataStrip: 'quiet',
    metadataFields: 'type modified locality',
    editorMaxWidth: '800px',
    shell: 'notebook',
    shellLabel: 'Notebook',
    traitLabels: ['Comfortable', 'Calm', 'Ledger', 'Paper', 'Plain'],
    writing: 'system',
    writingLabel: 'System',
  },
  {
    id: 'code-notebook',
    mode: 'dark',
    density: 'compact',
    motion: 'calm',
    graph: 'terminal',
    canvas: 'terminal',
    codeBlock: 'terminal',
    heading: 'terminal',
    metadataStrip: 'terminal',
    metadataFields: 'type status modified locality',
    editorMaxWidth: '820px',
    shell: 'terminal',
    shellLabel: 'Terminal',
    traitLabels: ['Compact', 'Calm', 'Terminal'],
    writing: 'terminal',
    writingLabel: 'Terminal',
  },
]
