import { useEffect, useRef } from 'react'

export default function MessagePane({ messages }) {
  const paneRef = useRef(null)

  useEffect(() => {
    if (!paneRef.current) return
    paneRef.current.scrollTop = paneRef.current.scrollHeight
  }, [messages])

  return (
    <section ref={paneRef} className="ic3-message-pane" aria-label="Conversation">
      {messages.map((message) => (
        <article key={message.id} className={`ic3-message ${message.author === 'assistant' ? 'from-assistant' : 'from-user'}`}>
          <p>{message.text}</p>
          <time>
            {message.time}
            {message.responseTimeLabel ? ` · ${message.responseTimeLabel}` : ''}
          </time>
        </article>
      ))}
    </section>
  )
}
