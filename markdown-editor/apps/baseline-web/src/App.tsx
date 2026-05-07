import {
  GrimoireMarkdownEditor,
  getGrimoireBlockTypeSelectItems,
  getGrimoireCustomSlashMenuItems,
  type GrimoireSlashMenuItem,
} from '@grimoire/markdown-editor/react'
import '@blocknote/mantine/style.css'
import { isValidElement, type ReactNode } from 'react'

type CatalogGroup = {
  name: string
  items: GrimoireSlashMenuItem[]
}

const DEMO_NOW = new Date(2026, 3, 30, 15, 4)
const catalogOnlyEditor = Object.freeze({}) as unknown as Parameters<
  typeof getGrimoireCustomSlashMenuItems
>[0]

const blockItems = getGrimoireBlockTypeSelectItems()
const customItems = getGrimoireCustomSlashMenuItems(catalogOnlyEditor, DEMO_NOW)
const customGroups = groupCatalogItems(customItems)
const SAMPLE_MARKDOWN = `# Markdown editor baseline

Type / in this editor to use the Grimoire package slash menu.

- [ ] Extract the editor
- [ ] Reuse it from Tauri
- [ ] Bridge it into SwiftUI
`

/** Renders the package catalog without requiring Grimoire vault state. */
export default function App() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">@grimoire/markdown-editor/react</p>
        <h1>Markdown editor baseline</h1>
        <p className="lede">
          Static slash-command catalog for package demos, docs, and integration checks.
        </p>
      </header>

      <section className="summary-grid" aria-label="Catalog summary">
        <SummaryMetric label="Custom commands" value={customItems.length} />
        <SummaryMetric label="Command groups" value={customGroups.length} />
        <SummaryMetric label="Markdown block types" value={blockItems.length} />
      </section>

      <section className="editor-product" aria-label="Standalone markdown editor">
        <GrimoireMarkdownEditor
          className="baseline-editor"
          initialMarkdown={SAMPLE_MARKDOWN}
          theme="light"
        />
      </section>

      <section className="catalog-section" aria-labelledby="block-types-heading">
        <div className="section-heading">
          <p className="eyebrow">Baseline blocks</p>
          <h2 id="block-types-heading">Markdown-safe block types</h2>
        </div>
        <div className="block-grid">
          {blockItems.map((item) => (
            <article className="block-tile" key={`${item.type}-${item.name}`}>
              <item.icon aria-hidden="true" size={20} strokeWidth={1.9} />
              <div>
                <h3>{item.name}</h3>
                <p>{formatBlockSignature(item)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="catalog-section" aria-labelledby="slash-heading">
        <div className="section-heading">
          <p className="eyebrow">Slash commands</p>
          <h2 id="slash-heading">Grimoire command catalog</h2>
        </div>
        <div className="group-stack">
          {customGroups.map((group) => (
            <section className="command-group" key={group.name} aria-labelledby={group.name}>
              <div className="group-heading">
                <h3 id={group.name}>{group.name}</h3>
                <span>{group.items.length}</span>
              </div>
              <div className="command-grid">
                {group.items.map((item) => (
                  <CommandCard item={item} key={item.key} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}

function SummaryMetric(props: { label: string; value: number }) {
  return (
    <article className="summary-tile">
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </article>
  )
}

function CommandCard({ item }: { item: GrimoireSlashMenuItem }) {
  return (
    <article className="command-card">
      <div className="command-title-row">
        {renderIcon(item.icon)}
        <div>
          <h4>{item.title}</h4>
          <code>/{item.key.replace(/^grimoire_/, '')}</code>
        </div>
      </div>
      <p>{item.subtext}</p>
      <AliasList aliases={item.aliases ?? []} />
    </article>
  )
}

function AliasList({ aliases }: { aliases: string[] }) {
  if (aliases.length === 0) return null

  return (
    <ul className="alias-list" aria-label="Aliases">
      {aliases.map((alias) => (
        <li key={alias}>{alias}</li>
      ))}
    </ul>
  )
}

function renderIcon(icon: ReactNode) {
  if (!isValidElement(icon)) return null
  return <span className="command-icon">{icon}</span>
}

function groupCatalogItems(items: GrimoireSlashMenuItem[]): CatalogGroup[] {
  const groups = new Map<string, GrimoireSlashMenuItem[]>()

  for (const item of items) {
    const groupName = item.group ?? 'Other'
    groups.set(groupName, [...(groups.get(groupName) ?? []), item])
  }

  return Array.from(groups, ([name, groupedItems]) => ({ name, items: groupedItems }))
}

function formatBlockSignature(item: ReturnType<typeof getGrimoireBlockTypeSelectItems>[number]) {
  const props = item.props ? ` ${JSON.stringify(item.props)}` : ''
  return `${item.type}${props}`
}
