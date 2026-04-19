export default function ChatHeader() {
  return (
    <header className="ic-chat-header">
      <h2 className="ic-chat-title">Interview Kraft</h2>
      <span className="ic-chat-timer" aria-label="Session timer">00:00</span>
      <button type="button" className="ic-chat-menu" aria-label="Open chat options">
        <span />
        <span />
        <span />
      </button>
    </header>
  )
}
