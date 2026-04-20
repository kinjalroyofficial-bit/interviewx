export default function ChatComposer({
  value = '',
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type message...'
}) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (onSend) onSend()
    }
  }

  return (
    <footer className="ic3-composer">
      <input
        id="interview-center-chat-input"
        type="text"
        className="ic3-composer-input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button type="button" className="ic3-send-button" onClick={onSend} disabled={disabled}>Send</button>
    </footer>
  )
}
