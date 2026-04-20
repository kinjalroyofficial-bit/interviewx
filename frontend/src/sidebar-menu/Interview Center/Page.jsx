import { useEffect, useMemo, useState } from 'react'
import { nextInterviewQuestion, startInterview } from '../../api'
import ChatComposer from './components/ChatComposer'
import ChatHeader from './components/ChatHeader'
import CurrentInterviewCard from './components/CurrentInterviewCard'
import InterviewHistoryPanel from './components/InterviewHistoryPanel'
import MessagePane from './components/MessagePane'
import RightPlaceholderPanel from './components/RightPlaceholderPanel'
import ThemeToggle from './components/ThemeToggle'
import './interview-center.css'

const mockInterviews = [
  {
    id: 'int-005',
    title: 'System Design Simulation',
    difficulty: 'Advanced',
    mode: 'Mock',
    topics: ['System Design', 'Caching', 'Scalability', 'Load Balancing'],
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
    difficulty: 'Intermediate',
    mode: 'Practice',
    topics: ['Leadership'],
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
    difficulty: 'Intermediate',
    mode: 'Practice',
    topics: ['React'],
    role: 'React Developer',
    practicedAt: '2026-04-17T15:30:00Z',
    messages: [
      { id: 'a3', author: 'assistant', text: 'Implement a searchable virtualized list.', time: '15:31' },
      { id: 'u3', author: 'user', text: 'I would memoize filtered results and window rendering.', time: '15:34' }
    ]
  }
]

export default function InterviewCenterPage({ sidebarCollapsed = false }) {
  const currentUsername = localStorage.getItem('interviewx-user') || ''
  const [isLightTheme, setIsLightTheme] = useState(false)
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

  const [activeInterviewId, setActiveInterviewId] = useState('')
  const [liveInterview, setLiveInterview] = useState(null)
  const [isStartingInterview, setIsStartingInterview] = useState(false)
  const [isSendingAnswer, setIsSendingAnswer] = useState(false)
  const [composerValue, setComposerValue] = useState('')
  const [startInterviewError, setStartInterviewError] = useState('')
  const [currentSetup, setCurrentSetup] = useState({
    selectedMode: 'Free-Flowing - Conversational',
    selectedTopics: []
  })
  const fallbackInterview = interviews[0]
  const activeInterview = interviews.find((item) => item.id === activeInterviewId) || null
  const defaultChatInterview = { title: 'My Interview' }

  useEffect(() => {
    const shell = document.querySelector('.dashboard-shell')
    if (!shell) return
    setIsLightTheme(shell.classList.contains('dashboard-theme-light'))
  }, [])

  function handleThemeToggle() {
    const shell = document.querySelector('.dashboard-shell')
    if (!shell) return

    const nextIsLight = !shell.classList.contains('dashboard-theme-light')
    shell.classList.toggle('dashboard-theme-light', nextIsLight)
    setIsLightTheme(nextIsLight)
  }

  async function handleStartInterview() {
    if (!currentUsername) {
      setStartInterviewError('Please log in again before starting the interview.')
      return
    }

    setIsStartingInterview(true)
    setStartInterviewError('')
    try {
      const data = await startInterview({
        username: currentUsername,
        selected_mode: currentSetup.selectedMode,
        selected_topics: currentSetup.selectedTopics
      })
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLiveInterview({
        id: data.interview_id,
        title: 'Live Interview',
        messages: [
          {
            id: `${data.interview_id}-q1`,
            author: 'assistant',
            text: data.first_question,
            time: nowTime
          }
        ]
      })
    } catch (error) {
      setStartInterviewError(error.message || 'Unable to start interview.')
    } finally {
      setIsStartingInterview(false)
    }
  }

  async function handleSendAnswer() {
    if (!liveInterview || isSendingAnswer) return
    const answer = composerValue.trim()
    if (!answer) return

    setIsSendingAnswer(true)
    const userMessageId = `${liveInterview.id}-u-${Date.now()}`
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLiveInterview((currentInterview) => {
      if (!currentInterview) return currentInterview
      return {
        ...currentInterview,
        messages: [
          ...currentInterview.messages,
          {
            id: userMessageId,
            author: 'user',
            text: answer,
            time: nowTime
          }
        ]
      }
    })
    setComposerValue('')

    try {
      const data = await nextInterviewQuestion({
        interview_id: liveInterview.id,
        answer
      })
      const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLiveInterview((currentInterview) => {
        if (!currentInterview) return currentInterview
        return {
          ...currentInterview,
          messages: [
            ...currentInterview.messages,
            {
              id: `${currentInterview.id}-a-${Date.now()}`,
              author: 'assistant',
              text: data.next_question,
              time: assistantTime
            }
          ]
        }
      })
    } catch (error) {
      setStartInterviewError(error.message || 'Unable to send answer.')
    } finally {
      setIsSendingAnswer(false)
    }
  }

  return (
    <main className={`ic3-layout ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <header className="ic3-workspace-header">
        <h1>Interview Center</h1>
        <div className="ic3-header-actions">
          <ThemeToggle checked={isLightTheme} onChange={handleThemeToggle} />
          <button type="button" className="ic3-header-button">Logout</button>
        </div>
      </header>

      <section className="ic3-left-stack">
        <InterviewHistoryPanel
          interviews={interviews}
          activeId={activeInterview?.id || ''}
          onSelect={setActiveInterviewId}
        />
        <CurrentInterviewCard
          activeInterview={activeInterview || fallbackInterview}
          username={currentUsername}
          onSetupChange={setCurrentSetup}
        />
      </section>

      <section className="ic3-panel ic3-chat-panel">
        <ChatHeader interview={liveInterview || activeInterview || defaultChatInterview} />
        {liveInterview ? (
          <>
            <MessagePane messages={liveInterview.messages} />
            <ChatComposer
              value={composerValue}
              onChange={setComposerValue}
              onSend={handleSendAnswer}
              disabled={isSendingAnswer}
              placeholder={isSendingAnswer ? 'Sending...' : 'Type your answer...'}
            />
          </>
        ) : activeInterview ? (
          <>
            <MessagePane messages={activeInterview.messages} />
            <ChatComposer disabled placeholder="Start a live interview to send answers..." />
          </>
        ) : (
          <div className="ic3-chat-empty-state">
            <button
              type="button"
              className="ic3-start-interview-button"
              onClick={handleStartInterview}
              disabled={isStartingInterview}
            >
              {isStartingInterview ? 'Starting Interview...' : 'Start My Interview'}
            </button>
            {startInterviewError ? <p>{startInterviewError}</p> : null}
          </div>
        )}
      </section>

      <RightPlaceholderPanel />

      <aside className={`ic3-panel ic3-response-rail ${sidebarCollapsed ? 'is-visible' : ''}`} aria-label="Response analytics">
        <p>Response Analytics</p>
      </aside>
    </main>
  )
}
