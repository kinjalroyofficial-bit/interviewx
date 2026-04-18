import { useMemo, useState } from 'react'

function Icon({ kind }) {
  const paths = {
    awareness: 'M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0Zm8-3v6m-3-3h6',
    tech: 'M4 7h16v10H4zM8 17v3m8-3v3M12 7V4',
    career: 'M5 8h14v10H5zM9 8V6h6v2',
    map: 'M5 6l5-2 4 2 5-2v14l-5 2-4-2-5 2z',
    analytics: 'M5 19V9m5 10V5m5 14v-7m5 7V8',
    communication: 'M4 6h16v10H8l-4 4z',
    speech: 'M12 4a4 4 0 0 1 4 4v4a4 4 0 1 1-8 0V8a4 4 0 0 1 4-4zm-6 9a6 6 0 0 0 12 0',
    thought: 'M5 12a7 7 0 1 1 14 0c0 3-2 4-2 6H7c0-2-2-3-2-6z',
    latency: 'M12 5v7l4 2M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0Z',
    vocabulary: 'M6 5h12v14H6zM9 9h6m-6 4h6',
    study: 'M4 6h7v14H4zM13 6h7v14h-7z',
    course: 'M4 7h16l-8 4-8-4zm0 4l8 4 8-4',
    editor: 'M5 17h14M7 14l7-7 3 3-7 7H7z',
    repo: 'M5 6h10l4 4v8H5zM15 6v4h4',
    quest: 'M12 3l2.8 5.7L21 10l-4.5 4.3L17.6 21 12 18l-5.6 3 1.1-6.7L3 10l6.2-1.3z',
    resume: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4',
    network: 'M6 6h4v4H6zM14 6h4v4h-4zM10 14h4v4h-4zM10 8h4m-6 2 4 4m2-4-4 4',
    company: 'M4 20h16M6 20V8h12v12M9 12h2m2 0h2',
    job: 'M4 8h16v10H4zM9 8V6h6v2',
    'tech-network': 'M5 12h4m6 0h4M12 5v4m0 6v4M8 8l2 2m4 4 2 2m0-8-2 2m-4 4-2 2',
    interview: 'M4 6h16v10H4zM8 20h8M12 16v4',
    bullet: 'M7 12h10m-4-4 4 4-4 4',
    sentence: 'M5 8h14M5 12h10M5 16h12',
    punctuation: 'M9 7a3 3 0 1 1 5.2 2.1c-.8 1.2-2.2 2-2.2 3.9M12 18h.01',
    'audio-leaf': 'M7 10v4m3-6v8m3-10v12m3-8v4',
    situation: 'M4 7h16v10H8l-4 4z',
    topic: 'M6 6h12v12H6zM9 9h6M9 12h4',
    natural: 'M5 14c4-2 6-5 7-9 3 4 5 7 7 9-4 0-8 0-14 0z',
    drive: 'M4 13h16M7 13l1-3h8l1 3M8 17h.01M16 17h.01',
    words: 'M5 6h14M5 10h14M5 14h10M5 18h8',
    synonyms: 'M4 8h7v8H4zM13 8h7v8h-7M8 12h8',
    phrases: 'M5 7h14M5 12h14M5 17h9M16 15l3 2-3 2',
    grammar: 'M6 5h12v14H6zM9 9h6M9 13h6M9 17h4',
    chevron: 'm9 6 6 6-6 6',
    collapse: 'M15 18l-6-6 6-6',
    expand: 'M9 6l6 6-6 6'
  }

  return (
    <svg viewBox="0 0 24 24" className="sidebar-icon" aria-hidden="true">
      <path d={paths[kind] || paths.bullet} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MenuNode({ item, depth, collapsed, openPaths, selectedPath, onItemClick }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0
  const path = item.__path
  const isOpen = openPaths.has(path)
  const nextDepth = depth + 1

  return (
    <li>
      <button
        type="button"
        className={`sidebar-item depth-${depth} ${isOpen ? 'is-open' : ''} ${selectedPath === path ? 'is-selected' : ''}`}
        onClick={() => onItemClick(path, hasChildren)}
        title={collapsed ? item.label : undefined}
      >
        <Icon kind={item.icon} />
        {!collapsed ? <span className="sidebar-label">{item.label}</span> : null}
        {!collapsed && hasChildren ? <Icon kind="chevron" /> : null}
      </button>

      {hasChildren && isOpen ? (
        <ul className="sidebar-children">
          {item.children.map((child) => (
            <MenuNode
              key={child.id}
              item={{ ...child, __path: `${path}/${child.id}`, __parent: path }}
              depth={nextDepth}
              collapsed={collapsed}
              openPaths={openPaths}
              selectedPath={selectedPath}
              onItemClick={onItemClick}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export default function Sidebar({ menu, greetingText, displayName }) {
  const [collapsed, setCollapsed] = useState(false)
  const [openPaths, setOpenPaths] = useState(() => new Set(['awareness']))
  const [selectedPath, setSelectedPath] = useState('awareness')

  const preparedMenu = useMemo(
    () => menu.map((item) => ({ ...item, __path: item.id, __parent: 'root' })),
    [menu]
  )

  function handleToggle(path) {
    setOpenPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  function handleItemClick(path, hasChildren) {
    setSelectedPath(path)

    if (collapsed) {
      setCollapsed(false)
      if (hasChildren && !openPaths.has(path)) {
        handleToggle(path)
      }
      return
    }

    if (hasChildren) {
      handleToggle(path)
    }
  }

  return (
    <aside className={`dashboard-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed ? <strong className="sidebar-brand">InterviewX</strong> : null}
        <button type="button" className="sidebar-collapse-toggle" onClick={() => setCollapsed((prev) => !prev)} aria-label="Toggle sidebar">
          <Icon kind={collapsed ? 'expand' : 'collapse'} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu-root">
          {preparedMenu.map((item) => (
            <MenuNode
              key={item.id}
              item={item}
              depth={0}
              collapsed={collapsed}
              openPaths={openPaths}
              selectedPath={selectedPath}
              onItemClick={handleItemClick}
            />
          ))}
        </ul>
      </nav>

      <footer className="sidebar-profile" title={collapsed ? greetingText : undefined}>
        <div className="sidebar-avatar" aria-hidden="true">{displayName ? displayName[0].toUpperCase() : 'U'}</div>
        {!collapsed ? <p className="sidebar-greeting">{greetingText}</p> : null}
      </footer>
    </aside>
  )
}
