import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import type { FolderNode } from '../../types'
import {
  BrainIcon,
  GrimoireStarIcon,
  PuranasIcon,
  RishiIcon,
  SecondBrainIcon,
  ShaastrasIcon,
  VedasIcon,
} from '../icons/grimoireKnowledgeIcons'
import {
  AgentFolderGlyphIcon,
  DataFolderGlyphIcon,
  DefaultFolderGlyphIcon,
  DefaultFolderOpenGlyphIcon,
  DevFolderGlyphIcon,
  DocsFolderGlyphIcon,
  JournalFolderGlyphIcon,
  PrivateFolderGlyphIcon,
  ResearchFolderGlyphIcon,
  StorageFolderGlyphIcon,
  TemplateFolderGlyphIcon,
  VaultFolderGlyphIcon,
} from './folderDomainIcons'

type FolderGlyphTone =
  | 'folder'
  | 'veda'
  | 'shaastra'
  | 'purana'
  | 'rishi'
  | 'brain'
  | 'star'
  | 'agent'
  | 'storage'
  | 'docs'
  | 'dev'
  | 'data'
  | 'journal'
  | 'vault'
  | 'private'
  | 'research'
  | 'template'

type FolderGlyphMotif =
  | 'folder'
  | 'vault'
  | 'private'
  | 'knowledge'
  | 'mind'
  | 'route'
  | 'sky'
  | 'blueprint'

/** Resolved icon metadata for one left-sidebar folder row. */
export interface FolderGlyphModel {
  Icon: ComponentType<IconProps>
  motif: FolderGlyphMotif
  name: string
  tone: FolderGlyphTone
}

interface SemanticFolderGlyph {
  exactTerms?: readonly string[]
  Icon: ComponentType<IconProps>
  motif: FolderGlyphMotif
  name: string
  terms: readonly string[]
  tone: FolderGlyphTone
}

const SEMANTIC_FOLDER_GLYPHS: readonly SemanticFolderGlyph[] = [
  {
    name: 'agent',
    tone: 'agent',
    Icon: AgentFolderGlyphIcon,
    motif: 'mind',
    terms: ['agent', 'agents', 'agent council', 'mcp', 'codex', 'claude', 'chitragupta', 'pavani', 'council', 'orchestrator'],
  },
  {
    name: 'private',
    tone: 'private',
    Icon: PrivateFolderGlyphIcon,
    motif: 'private',
    terms: ['private', 'local only', 'local-only', 'personal', 'secret', 'secrets', 'protected', 'locked', 'password', 'निजी', 'गुप्त'],
  },
  {
    name: 'second-brain',
    tone: 'brain',
    Icon: SecondBrainIcon,
    motif: 'mind',
    terms: ['second brain', 'second-brain', '2nd brain', '2nd-brain', 'memory ledger', 'knowledge graph', 'दूसरा दिमाग', 'दूसरा मस्तिष्क'],
  },
  {
    name: 'brain',
    tone: 'brain',
    Icon: BrainIcon,
    motif: 'mind',
    terms: ['brain', 'memory', 'smriti', 'manas', 'mind', 'recall', 'ai', 'llm', 'स्मृति', 'मनस्', 'मानस', 'दिमाग', 'मस्तिष्क'],
  },
  {
    name: 'journal',
    tone: 'journal',
    Icon: JournalFolderGlyphIcon,
    motif: 'private',
    terms: ['journal', 'journals', 'diary', 'diaries', 'dream', 'dreams', 'daily', 'log', 'logs', 'capture', 'thoughts', 'स्वप्न', 'दैनंदिनी'],
  },
  {
    name: 'rishi',
    tone: 'rishi',
    Icon: RishiIcon,
    motif: 'sky',
    terms: ['rishi', 'rsi', 'guru', 'sage', 'acharya', 'parampara', 'lineage', 'ऋषि', 'गुरु', 'मुनि', 'आचार्य'],
  },
  {
    name: 'shaastras',
    tone: 'shaastra',
    Icon: ShaastrasIcon,
    motif: 'knowledge',
    terms: ['shaastra', 'shaastras', 'shastra', 'shastras', 'sastra', 'sastras', 'sutra', 'sutras', 'bhashya', 'agama', 'agamas', 'tantra', 'tantras', 'darshana', 'nyaya', 'mimamsa', 'vyakarana', 'शास्त्र', 'शास्त्राणि', 'सूत्र', 'तन्त्र'],
  },
  {
    name: 'puranas',
    tone: 'purana',
    Icon: PuranasIcon,
    motif: 'knowledge',
    terms: ['purana', 'puranas', 'itihasa', 'itihasas', 'mahabharata', 'ramayana', 'bhagavata', 'पुराण', 'पुराणानि', 'इतिहास', 'रामायण', 'महाभारत'],
  },
  {
    name: 'vedas',
    tone: 'veda',
    Icon: VedasIcon,
    motif: 'knowledge',
    terms: ['veda', 'vedas', 'vedic', 'vedanga', 'vedangas', 'shruti', 'samhita', 'brahmana', 'aranyaka', 'upanishad', 'upanishads', 'upanisad', 'upanisads', 'वेद', 'वेदाः', 'वेदाङ्ग', 'वेदांग', 'श्रुति', 'उपनिषद्'],
  },
  {
    name: 'docs',
    tone: 'docs',
    Icon: DocsFolderGlyphIcon,
    motif: 'knowledge',
    terms: ['doc', 'docs', 'documentation', 'guide', 'guides', 'architecture', 'status', 'readme'],
  },
  {
    name: 'dev',
    tone: 'dev',
    Icon: DevFolderGlyphIcon,
    motif: 'route',
    terms: ['frontend', 'backend', 'src', 'source', 'components', 'hooks', 'lib', 'utils', 'types', 'api', 'server', 'client', 'scripts', 'cli', 'tests', 'test'],
  },
  {
    name: 'data',
    tone: 'data',
    Icon: DataFolderGlyphIcon,
    motif: 'route',
    terms: ['data', 'database', 'db', 'sqlite', 'ephemeris', 'fixtures', 'fixture', 'assets'],
  },
  {
    name: 'storage',
    tone: 'storage',
    Icon: StorageFolderGlyphIcon,
    motif: 'route',
    terms: ['storage', 'sync', 'import', 'export', 'portability', 'backup', 'icloud', 'gdrive', 'google drive', 's3', 'azure', 'blob', 'provider', 'capsule', 'snapshot'],
  },
  {
    name: 'research',
    tone: 'research',
    Icon: ResearchFolderGlyphIcon,
    motif: 'route',
    terms: ['research', 'audit', 'review', 'reviews', 'reference', 'references', 'source survey', 'papers', 'evidence'],
  },
  {
    name: 'template',
    tone: 'template',
    Icon: TemplateFolderGlyphIcon,
    motif: 'blueprint',
    terms: ['template', 'templates', 'blueprint', 'blueprints', 'boilerplate', 'snippet', 'snippets'],
  },
  {
    name: 'vault',
    tone: 'vault',
    Icon: VaultFolderGlyphIcon,
    motif: 'vault',
    exactTerms: ['library', 'libraries', 'notebook', 'notebooks', 'notes'],
    terms: ['vault', 'vaults', 'grimoire'],
  },
  {
    name: 'star',
    tone: 'star',
    Icon: GrimoireStarIcon,
    motif: 'sky',
    terms: ['star', 'stars', 'astral', 'graha', 'nakshatra', 'rashi', 'rasi', 'jyotisa', 'jyotisha', 'panchanga', 'horoscope', 'chart', 'ग्रह', 'नक्षत्र', 'राशि', 'ज्योतिष'],
  },
]

function normalizeFolderSignal(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[_/.-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function signalHasTerm(signal: string, term: string): boolean {
  return ` ${signal} `.includes(` ${normalizeFolderSignal(term)} `)
}

function findSemanticFolderGlyph(
  signal: string,
  options: { skipNames?: readonly string[] } = {},
): SemanticFolderGlyph | null {
  return SEMANTIC_FOLDER_GLYPHS.find((glyph) => (
    !options.skipNames?.includes(glyph.name)
      && (
        glyph.terms.some((term) => signalHasTerm(signal, term))
        || glyph.exactTerms?.some((term) => signal === normalizeFolderSignal(term))
      )
  )) ?? null
}

function resolveSemanticFolderGlyph(node: FolderNode): SemanticFolderGlyph | null {
  const ownGlyph = findSemanticFolderGlyph(normalizeFolderSignal(node.name))
  if (ownGlyph && ownGlyph.name !== 'vault') {
    return ownGlyph
  }

  const ancestorPath = node.path.split('/').slice(0, -1).join(' ')
  if (ancestorPath) {
    const inheritedGlyph = findSemanticFolderGlyph(normalizeFolderSignal(ancestorPath), { skipNames: ['vault'] })
    if (inheritedGlyph) {
      return inheritedGlyph
    }
  }

  return ownGlyph
}

/** Chooses the semantic Grimoire glyph, or the normal open/closed folder glyph. */
export function resolveFolderGlyphModel(node: FolderNode, isOpen: boolean): FolderGlyphModel {
  const semanticGlyph = resolveSemanticFolderGlyph(node)
  if (semanticGlyph) {
    return {
      Icon: semanticGlyph.Icon,
      motif: semanticGlyph.motif,
      name: semanticGlyph.name,
      tone: semanticGlyph.tone,
    }
  }

  return {
    Icon: isOpen ? DefaultFolderOpenGlyphIcon : DefaultFolderGlyphIcon,
    motif: 'folder',
    name: isOpen ? 'folder-open' : 'folder',
    tone: 'folder',
  }
}
