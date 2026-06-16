import { FileCode, Graph, Palette, Sparkle, StackSimple, TextAa } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type {
  PresetOption,
  ProfileShellStyle,
  ProfileWritingStyle,
} from './appearanceSettingsOptions'
import type {
  ThemeCanvasStyle,
  ThemeCodeBlockStyle,
  ThemeDensityScale,
  ThemeGraphStyle,
  ThemeMotionProfile,
} from '../themes/themeRegistry'

type ProfileTraitSource = Pick<
  PresetOption,
  | 'canvasStyle'
  | 'codeBlockStyle'
  | 'densityScale'
  | 'graphStyle'
  | 'motionProfile'
  | 'shellStyle'
  | 'writingStyle'
>

export interface ProfileTraitView {
  icon: ReactNode
  key: keyof ProfileTraitSource
  label: string
  value: string
}

const SHELL_LABELS: Record<ProfileShellStyle, string> = {
  archive: 'Archive',
  map: 'Map',
  notebook: 'Notebook',
  terminal: 'Terminal',
}

const WRITING_LABELS: Record<ProfileWritingStyle, string> = {
  graph: 'Graph',
  manuscript: 'Manuscript',
  system: 'System',
  terminal: 'Terminal',
}

const DENSITY_LABELS: Record<ThemeDensityScale, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
}

const MOTION_LABELS: Record<ThemeMotionProfile, string> = {
  calm: 'Calm',
  standard: 'Standard',
  expressive: 'Expressive',
}

const GRAPH_LABELS: Record<ThemeGraphStyle, string> = {
  constellation: 'Constellation',
  ledger: 'Ledger',
  terminal: 'Terminal',
}

const CANVAS_LABELS: Record<ThemeCanvasStyle, string> = {
  blueprint: 'Blueprint',
  paper: 'Paper',
  terminal: 'Terminal',
}

const CODE_BLOCK_LABELS: Record<ThemeCodeBlockStyle, string> = {
  notebook: 'Notebook',
  plain: 'Plain',
  terminal: 'Terminal',
}

/** Builds the visible contract for a complete Grimoire experience profile. */
export function buildProfileTraitViews(source: ProfileTraitSource): ProfileTraitView[] {
  return [
    {
      icon: <StackSimple size={11} weight="bold" />,
      key: 'shellStyle',
      label: 'Shell',
      value: SHELL_LABELS[source.shellStyle],
    },
    {
      icon: <StackSimple size={11} weight="bold" />,
      key: 'densityScale',
      label: 'Density',
      value: DENSITY_LABELS[source.densityScale],
    },
    {
      icon: <TextAa size={11} weight="bold" />,
      key: 'writingStyle',
      label: 'Writing',
      value: WRITING_LABELS[source.writingStyle],
    },
    {
      icon: <Graph size={11} weight="bold" />,
      key: 'graphStyle',
      label: 'Graph',
      value: GRAPH_LABELS[source.graphStyle],
    },
    {
      icon: <Palette size={11} weight="bold" />,
      key: 'canvasStyle',
      label: 'Canvas',
      value: CANVAS_LABELS[source.canvasStyle],
    },
    {
      icon: <FileCode size={11} weight="bold" />,
      key: 'codeBlockStyle',
      label: 'Code',
      value: CODE_BLOCK_LABELS[source.codeBlockStyle],
    },
    {
      icon: <Sparkle size={11} weight="bold" />,
      key: 'motionProfile',
      label: 'Motion',
      value: MOTION_LABELS[source.motionProfile],
    },
  ]
}
