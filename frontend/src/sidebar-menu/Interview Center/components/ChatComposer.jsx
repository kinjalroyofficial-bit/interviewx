export default function ChatComposer() {
  return (
    <footer className="ic3-composer">
      <input
        id="interview-center-chat-input"
        type="text"
        className="ic3-composer-input"
        placeholder="Type message..."
      />
      <button type="button" className="ic3-send-button">Send</button>
    </footer>
  )
}
