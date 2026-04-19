export default function MessagePane() {
  return (
    <section className="ic-message-pane" aria-label="Chat messages">
      <button type="button" className="ic-start-button">Start Conversation</button>
      <p className="ic-empty-text">Start a conversation to begin your mock interview session.</p>
      <p className="ic-watermark" aria-hidden="true">
        <span className="ic-watermark-powered">Powered by</span>
        <span className="ic-watermark-brand">KOVIKI</span>
      </p>
    </section>
  )
}
