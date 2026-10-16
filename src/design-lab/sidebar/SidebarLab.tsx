import {
  Archive,
  BookOpen,
  ChevronRight,
  FileText,
  FlaskConical,
  FolderOpen,
  House,
  Inbox,
  MoonStar,
  NotebookPen,
  PenLine,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Waypoints,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Home', icon: House },
  { label: 'Inbox', icon: Inbox, count: 2, accent: true },
  { label: 'Notebook', icon: NotebookPen },
  { label: 'Pages', icon: FileText },
  { label: 'Graph', icon: Waypoints },
  { label: 'Journal', icon: BookOpen },
  { label: 'Dreams', icon: MoonStar },
  { label: 'Archive', icon: Archive },
] as const

const SPACES = [
  { label: 'Research Hub', icon: FlaskConical, tone: 'dl-tone-iris' },
  { label: 'Writing Studio', icon: PenLine, tone: 'dl-tone-sky' },
  { label: 'Personal OS', icon: Sprout, tone: 'dl-tone-teal' },
] as const

const FOLDERS = ['assets', 'research', 'personal', 'projects', 'templates']

export function SidebarLab({ active = 'Notebook' }: { active?: string }) {
  return (
    <aside className="dl-sidebar">
      <div className="dl-sidebar__brand">
        <div className="dl-sidebar__logo">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="dl-sidebar__word">Grimoire</div>
          <div className="dl-sidebar__tag">Living notebook</div>
        </div>
      </div>

      <div className="dl-sidebar__search">
        <Search size={13} />
        <span>Search</span>
        <kbd>⌘F</kbd>
      </div>

      <div className="dl-navgroup">
        {NAV_ITEMS.map((item) => (
          <div
            className={item.label === active ? 'dl-navitem dl-navitem--active' : 'dl-navitem'}
            key={item.label}
          >
            <item.icon size={15} />
            {item.label}
            {'count' in item && item.count !== undefined && (
              <span
                className={
                  item.accent
                    ? 'dl-navitem__count dl-navitem__count--accent'
                    : 'dl-navitem__count'
                }
              >
                {item.count}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="dl-sidehead">
        Spaces
        <Plus size={11} />
      </div>
      <div className="dl-navgroup">
        {SPACES.map((space) => (
          <div className={`dl-space ${space.tone}`} key={space.label}>
            <span className="dl-space__glyph">
              <space.icon size={11} />
            </span>
            {space.label}
          </div>
        ))}
      </div>

      <div className="dl-sidehead">Folders</div>
      <div className="dl-navgroup">
        {FOLDERS.map((name) => (
          <div className="dl-folder" key={name}>
            <FolderOpen size={13} />
            {name}
          </div>
        ))}
        <div className="dl-folder">
          <ChevronRight size={13} />
          More
        </div>
      </div>

      <div className="dl-sidebar__foot">
        <span className="dl-dot" />
        All systems normal
        <ShieldCheck size={13} style={{ marginLeft: 'auto' }} />
      </div>
    </aside>
  )
}
