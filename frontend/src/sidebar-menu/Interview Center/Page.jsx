import { useMemo, useState } from 'react'
import ChatComposer from './components/ChatComposer'
import ChatHeader from './components/ChatHeader'
import InterviewHistoryPanel from './components/InterviewHistoryPanel'
import MessagePane from './components/MessagePane'
import RightPlaceholderPanel from './components/RightPlaceholderPanel'
import './interview-center.css'

const mockInterviews = [
  {
    id: 'int-005',
    title: 'System Design Simulation',
    role: 'Senior Backend Engineer',
    practicedAt: '2026-04-19T09:20:00Z',
    messages: [
      { id: 'a1', author: 'assistant', text: 'Walk me through your cache invalidation strategy.', time: '09:22' },
      { id: 'u1', author: 'user', text: 'I use event-driven invalidation with TTL fallback.', time: '09:23' }
    ]
  },
  {
    id: 'int-004',
    title: 'Behavioral Round',
    role: 'Engineering Manager',
    practicedAt: '2026-04-18T18:10:00Z',
    messages: [
      { id: 'a2', author: 'assistant', text: 'Tell me about a difficult stakeholder conversation.', time: '18:12' },
      { id: 'u2', author: 'user', text: 'I handled it by aligning expectations with a phased plan.', time: '18:14' }
    ]
  },
  {
    id: 'int-003',
    title: 'Frontend Coding Round',
    role: 'React Developer',
    practicedAt: '2026-04-17T15:30:00Z',
    messages: [
      { id: 'a3', author: 'assistant', text: 'Implement a searchable virtualized list.', time: '15:31' },
      { id: 'u3', author: 'user', text: 'I would memoize filtered results and window rendering.', time: '15:34' }
    ]
  }
]

export default function InterviewCenterPage() {
  const interviews = useMemo(
    () => [...mockInterviews]
      .sort((a, b) => new Date(b.practicedAt).getTime() - new Date(a.practicedAt).getTime())
      .map((item) => ({
        ...item,
        displayTime: new Date(item.practicedAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      })),
    []
  )

  const [activeInterviewId, setActiveInterviewId] = useState(interviews[0]?.id || '')
  const activeInterview = interviews.find((item) => item.id === activeInterviewId) || interviews[0]

  return (
    <main className="ic3-layout">
      <InterviewHistoryPanel interviews={interviews} activeId={activeInterview.id} onSelect={setActiveInterviewId} />

      <section className="ic3-panel ic3-chat-panel">
        <ChatHeader interview={activeInterview} />
        <MessagePane messages={activeInterview.messages} />
        <ChatComposer />
      </section>

      <RightPlaceholderPanel />
    </main>
  )
}
