export default function MessagePane({ messages }) {
  return (
    <section className="ic3-message-pane" aria-label="Conversation">
      {messages.map((message) => (
        <article key={message.id} className={`ic3-message ${message.author === 'assistant' ? 'from-assistant' : 'from-user'}`}>
          <p>{message.text}</p>
          <time>{message.time}</time>
        </article>
      ))}
    </section>
  )
}
