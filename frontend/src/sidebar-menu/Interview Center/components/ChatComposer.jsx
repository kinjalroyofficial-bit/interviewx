export default function ChatComposer() {
  return (
    <footer className="ic-chat-composer">
      <label htmlFor="interview-center-chat-input" className="ic-composer-label">Message</label>
      <div className="ic-composer-input-row">
        <input
          id="interview-center-chat-input"
          type="text"
          className="ic-composer-input"
          placeholder="Type your response…"
        />
        <button type="button" className="ic-send-button">Send</button>
      </div>
    </footer>
  )
}
