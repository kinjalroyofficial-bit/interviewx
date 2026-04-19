export default function ChatHeader({ interview }) {
  return (
    <header className="ic3-chat-header">
      <h2>{interview.title}</h2>
      <p>{interview.role}</p>
    </header>
  )
}
