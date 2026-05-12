import { Braces } from 'lucide-react'
import {
  insertCodeBlock,
  type GrimoireCommandDefinition,
} from './grimoireSlashCommandActions'

interface MermaidTemplate {
  key: string
  title: string
  subtext: string
  aliases: string[]
  template: string
}

const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    key: 'grimoire_mermaid',
    title: 'Mermaid Diagram',
    subtext: 'Insert a fenced Mermaid flowchart.',
    aliases: ['diagram', 'flowchart', 'sequence', 'chart', 'mermaid'],
    template: 'flowchart TD\n  Idea[Idea] --> Draft[Draft]\n  Draft --> Review{Ready?}\n  Review -->|yes| Ship[Ship]\n  Review -->|no| Draft',
  },
  {
    key: 'grimoire_mermaid_flowchart',
    title: 'Flowchart',
    subtext: 'Map a process or decision tree.',
    aliases: ['flow', 'process', 'decision tree', 'diagram'],
    template: 'flowchart LR\n  Start([Start]) --> Capture[Capture]\n  Capture --> Link[[Spelllink notes]]\n  Link --> Done([Done])',
  },
  {
    key: 'grimoire_mermaid_sequence',
    title: 'Sequence Diagram',
    subtext: 'Show messages across people, apps, or agents.',
    aliases: ['sequence', 'messages', 'protocol', 'api flow'],
    template: 'sequenceDiagram\n  participant User\n  participant Grimoire\n  participant Agent\n  User->>Grimoire: Ask with context\n  Grimoire->>Agent: Send note snapshot\n  Agent-->>Grimoire: Stream answer',
  },
  {
    key: 'grimoire_mermaid_class',
    title: 'Class Diagram',
    subtext: 'Sketch objects, models, and contracts.',
    aliases: ['class', 'uml', 'model', 'schema'],
    template: 'classDiagram\n  class Note {\n    +String title\n    +String path\n  }\n  class Spelllink {\n    +String target\n  }\n  Note --> Spelllink',
  },
  {
    key: 'grimoire_mermaid_state',
    title: 'State Diagram',
    subtext: 'Describe states and transitions.',
    aliases: ['state', 'workflow', 'lifecycle', 'fsm'],
    template: 'stateDiagram-v2\n  [*] --> Inbox\n  Inbox --> Drafting\n  Drafting --> Linked\n  Linked --> Archived',
  },
  {
    key: 'grimoire_mermaid_er',
    title: 'ER Diagram',
    subtext: 'Map data relationships.',
    aliases: ['er', 'database', 'relation', 'entity relationship'],
    template: 'erDiagram\n  NOTE ||--o{ SPELLLINK : contains\n  NOTE {\n    string title\n    string path\n  }\n  SPELLLINK {\n    string target\n  }',
  },
  {
    key: 'grimoire_mermaid_gantt',
    title: 'Gantt Chart',
    subtext: 'Plan milestones over time.',
    aliases: ['gantt', 'timeline plan', 'schedule', 'roadmap'],
    template: 'gantt\n  title Project Roadmap\n  dateFormat  YYYY-MM-DD\n  section Build\n  Editor polish :active, 2026-05-01, 5d\n  Agent bridge :2026-05-06, 4d',
  },
  {
    key: 'grimoire_mermaid_pie',
    title: 'Pie Chart',
    subtext: 'Show rough proportions.',
    aliases: ['pie', 'chart', 'proportion', 'breakdown'],
    template: 'pie title Attention\n  "Writing" : 45\n  "Linking" : 30\n  "Review" : 25',
  },
  {
    key: 'grimoire_mermaid_journey',
    title: 'Journey Map',
    subtext: 'Map a user or thinking journey.',
    aliases: ['journey', 'user journey', 'experience map'],
    template: 'journey\n  title Note-making flow\n  section Capture\n    Quick thought: 5: User\n    Add Spelllink: 4: User\n  section Reuse\n    Ask agent: 4: User, Agent',
  },
  {
    key: 'grimoire_mermaid_timeline',
    title: 'Timeline',
    subtext: 'Capture events in chronological order.',
    aliases: ['timeline', 'history', 'events', 'chronology'],
    template: 'timeline\n  title Project history\n  2026-05-01 : Editor package split\n  2026-05-03 : Canvas contract\n  2026-05-07 : Visual refresh',
  },
  {
    key: 'grimoire_mermaid_mindmap',
    title: 'Mindmap',
    subtext: 'Branch concepts from one idea.',
    aliases: ['mindmap', 'brainstorm', 'concept map', 'map'],
    template: 'mindmap\n  root((Grimoire))\n    Markdown\n      Spelllinks\n      Mermaid\n    Canvas\n      Ink\n      Whiteboard\n    Agents\n      Claude\n      Codex\n      Chitragupta',
  },
  {
    key: 'grimoire_mermaid_use_case',
    title: 'Use Case Diagram',
    subtext: 'Represent use cases as a Mermaid flowchart.',
    aliases: ['use case', 'case diagram', 'actor', 'uml use case'],
    template: 'flowchart LR\n  User((Writer))\n  Agent((AI Agent))\n  User --> Create[Create note]\n  User --> Link[Link notes]\n  Agent --> Suggest[Suggest context]\n  Suggest --> Link',
  },
  {
    key: 'grimoire_mermaid_git_graph',
    title: 'Git Graph',
    subtext: 'Show branch and merge history.',
    aliases: ['git', 'branch', 'merge', 'version graph'],
    template: 'gitGraph\n  commit id: "start"\n  branch feature\n  checkout feature\n  commit id: "canvas"\n  checkout main\n  merge feature',
  },
]

/** Slash commands that insert durable Mermaid diagram fences. */
export const GRIMOIRE_MERMAID_SLASH_COMMANDS: GrimoireCommandDefinition[] = MERMAID_TEMPLATES.map((item) => ({
  key: item.key,
  title: item.title,
  subtext: item.subtext,
  aliases: item.aliases,
  group: 'Technical',
  icon: Braces,
  run: editor => insertCodeBlock(editor, 'mermaid', item.template),
}))
