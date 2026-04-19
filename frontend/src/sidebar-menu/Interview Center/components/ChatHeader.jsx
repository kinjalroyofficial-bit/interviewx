import { useEffect, useRef, useState } from 'react'

const MENU_ITEMS = [
  'Mute Reader',
  'Reset Interview',
  'Export Conversation',
  'Usage Guideline',
  'Feedback',
  'About',
]

export default function ChatHeader({ interview }) {
  const [chatMode, setChatMode] = useState('interview')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [])

  return (
    <header className="ic3-chat-header">
      <div className="ic3-chat-header-top-row">
        <h2>{interview.title}</h2>
        <div className="ic3-chat-header-actions">
          <div className="ic3-chat-mode-toggle" role="group" aria-label="Chat mode">
            <button
              type="button"
              className={`ic3-chat-mode-option ${chatMode === 'study' ? 'is-active' : ''}`}
              onClick={() => setChatMode('study')}
            >
              Study
            </button>
            <button
              type="button"
              className={`ic3-chat-mode-option ${chatMode === 'interview' ? 'is-active' : ''}`}
              onClick={() => setChatMode('interview')}
            >
              Interview
            </button>
          </div>

          <div className="ic3-chat-menu-wrap" ref={menuRef}>
            <div
              className="ic3-chat-menu-trigger"
              role="button"
              tabIndex={0}
              aria-label="Open chat options"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsMenuOpen((prev) => !prev)
                }
              }}
            >
              <span className="ic3-hamburger-line" />
              <span className="ic3-hamburger-line" />
              <span className="ic3-hamburger-line" />
            </div>

            {isMenuOpen ? (
              <div className="ic3-chat-menu-dropdown" role="menu" aria-label="Chat actions">
                {MENU_ITEMS.map((item) => (
                  <button key={item} type="button" className="ic3-chat-menu-item" role="menuitem">
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
