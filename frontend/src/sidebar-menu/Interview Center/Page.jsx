import ChatComposer from './components/ChatComposer'
import ChatHeader from './components/ChatHeader'
import MessagePane from './components/MessagePane'
import './interview-center.css'

export default function InterviewCenterPage() {
  return (
    <main className="ic-layout">
      <section className="ic-chat-shell">
        <ChatHeader />

        <div className="ic-chat-body">
          <MessagePane />
        </div>

        <ChatComposer />
      </section>
    </main>
  )
}
