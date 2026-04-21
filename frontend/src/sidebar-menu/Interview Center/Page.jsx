import { useEffect, useState } from 'react'
import { endInterview, getInterviewHistory, nextInterviewQuestion, startInterview } from '../../api'
import ChatComposer from './components/ChatComposer'
import ChatHeader from './components/ChatHeader'
import CurrentInterviewCard from './components/CurrentInterviewCard'
import InterviewHistoryPanel from './components/InterviewHistoryPanel'
import MessagePane from './components/MessagePane'
import RightPlaceholderPanel from './components/RightPlaceholderPanel'
import ThemeToggle from './components/ThemeToggle'
import './interview-center.css'

export default function InterviewCenterPage({ sidebarCollapsed = false }) {
  const currentUsername = localStorage.getItem('interviewx-user') || ''
  const [isLightTheme, setIsLightTheme] = useState(false)
  const [interviews, setInterviews] = useState([])

  const [activeInterviewId, setActiveInterviewId] = useState('')
  const [liveInterview, setLiveInterview] = useState(null)
  const [isStartingInterview, setIsStartingInterview] = useState(false)
  const [isSendingAnswer, setIsSendingAnswer] = useState(false)
  const [composerValue, setComposerValue] = useState('')
  const [startInterviewError, setStartInterviewError] = useState('')
  const [sendAnswerError, setSendAnswerError] = useState('')
  const [endInterviewError, setEndInterviewError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [isEndingInterview, setIsEndingInterview] = useState(false)
  const [currentSetup, setCurrentSetup] = useState({
    selectedMode: 'Free-Flowing - Conversational',
    selectedTopics: []
  })
  const fallbackInterview = {
    id: '',
    title: 'Current Interview',
    difficulty: 'Intermediate',
    topics: []
  }
  const activeInterview = interviews.find((item) => item.id === activeInterviewId) || null
  const defaultChatInterview = { title: 'My Interview' }

  useEffect(() => {
    const shell = document.querySelector('.dashboard-shell')
    if (!shell) return
    setIsLightTheme(shell.classList.contains('dashboard-theme-light'))
  }, [])

  useEffect(() => {
    if (!currentUsername) return
    loadInterviewHistory()
  }, [currentUsername])

  async function loadInterviewHistory() {
    try {
      setHistoryError('')
      const data = await getInterviewHistory(currentUsername)
      const mappedInterviews = (data.interviews || []).map((interview) => {
        const messages = (interview.transcript_turns || []).map((turn, idx) => ({
          id: `${interview.interview_id}-${idx}`,
          author: turn.role || 'assistant',
          text: turn.content || '',
          time: turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
        }))
        return {
          id: interview.interview_id,
          title: `Interview ${interview.interview_id.slice(-6)}`,
          displayTime: interview.created_at ? new Date(interview.created_at).toLocaleDateString() : 'Unknown',
          status: interview.status,
          interviewEnded: interview.status === 'ended',
          messages
        }
      })
      setInterviews(mappedInterviews)
    } catch (error) {
      setHistoryError(error.message || 'Unable to load interview history.')
    }
  }

  function handleThemeToggle() {
    const shell = document.querySelector('.dashboard-shell')
    if (!shell) return

    const nextIsLight = !shell.classList.contains('dashboard-theme-light')
    shell.classList.toggle('dashboard-theme-light', nextIsLight)
    setIsLightTheme(nextIsLight)
  }

  function formatResponseTime(durationMs) {
    if (durationMs < 1000) return `${durationMs} ms`
    return `${(durationMs / 1000).toFixed(2)} s`
  }

  async function handleStartInterview() {
    if (!currentUsername) {
      setStartInterviewError('Please log in again before starting the interview.')
      return
    }

    setIsStartingInterview(true)
    setStartInterviewError('')
    const requestStart = Date.now()
    try {
      const data = await startInterview({
        username: currentUsername,
        selected_mode: currentSetup.selectedMode,
        selected_topics: currentSetup.selectedTopics
      })
      const responseTimeLabel = `response ${formatResponseTime(Date.now() - requestStart)}`
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLiveInterview({
        id: data.interview_id,
        title: 'Live Interview',
        interviewEnded: false,
        lastResponseId: data.response_id || null,
        transcriptFilePath: null,
        messages: [
          {
            id: `${data.interview_id}-q1`,
            author: 'assistant',
            text: data.first_question,
            time: nowTime,
            responseTimeLabel
          }
        ]
      })
      await loadInterviewHistory()
    } catch (error) {
      setStartInterviewError(error.message || 'Unable to start interview.')
    } finally {
      setIsStartingInterview(false)
    }
  }

  async function handleSendAnswer() {
    if (!liveInterview || liveInterview.interviewEnded || isSendingAnswer) return
    const answer = composerValue.trim()
    if (!answer) return

    setIsSendingAnswer(true)
    setSendAnswerError('')
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
      const requestStart = Date.now()
      const data = await nextInterviewQuestion({
        interview_id: liveInterview.id,
        answer,
        previous_response_id: liveInterview.lastResponseId || null
      })
      const responseTimeLabel = `response ${formatResponseTime(Date.now() - requestStart)}`
      const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLiveInterview((currentInterview) => {
        if (!currentInterview) return currentInterview
        return {
          ...currentInterview,
          interviewEnded: Boolean(data.interview_ended),
          lastResponseId: data.response_id || currentInterview.lastResponseId || null,
          transcriptFilePath: data.transcript_file_path || currentInterview.transcriptFilePath || null,
          messages: [
            ...currentInterview.messages,
            {
              id: `${currentInterview.id}-a-${Date.now()}`,
              author: 'assistant',
              text: data.next_question,
              time: assistantTime,
              responseTimeLabel
            }
          ]
        }
      })
      await loadInterviewHistory()
    } catch (error) {
      setSendAnswerError(error.message || 'Unable to send answer.')
    } finally {
      setIsSendingAnswer(false)
    }
  }

  async function handleEndInterview() {
    if (!liveInterview || isEndingInterview) return

    setIsEndingInterview(true)
    setEndInterviewError('')
    try {
      const transcriptTurns = liveInterview.messages.map((message) => ({
        role: message.author,
        content: message.text,
        timestamp: message.time || null
      }))

      const data = await endInterview({
        interview_id: liveInterview.id,
        transcript_turns: transcriptTurns
      })
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLiveInterview((currentInterview) => {
        if (!currentInterview) return currentInterview
        return {
          ...currentInterview,
          interviewEnded: true,
          transcriptFilePath: data.transcript_file_path,
          messages: [
            ...currentInterview.messages,
            {
              id: `${currentInterview.id}-ended-${Date.now()}`,
              author: 'assistant',
              text: 'Interview ended. Analysis will be triggered from this transcript.',
              time: nowTime
            }
          ]
        }
      })
      await loadInterviewHistory()
    } catch (error) {
      setEndInterviewError(error.message || 'Unable to end interview.')
    } finally {
      setIsEndingInterview(false)
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
        {historyError ? <p>{historyError}</p> : null}
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
            <button
              type="button"
              className="ic3-end-interview-floating-button"
              onClick={handleEndInterview}
              disabled={isEndingInterview}
            >
              {isEndingInterview ? 'Saving...' : (liveInterview.interviewEnded ? 'Save Interview' : 'End Interview')}
            </button>
            <ChatComposer
              value={composerValue}
              onChange={setComposerValue}
              onSend={handleSendAnswer}
              disabled={isSendingAnswer || liveInterview.interviewEnded}
              placeholder={liveInterview.interviewEnded ? 'Interview ended.' : (isSendingAnswer ? 'Sending...' : 'Type your answer...')}
            />
            {sendAnswerError ? <p>{sendAnswerError}</p> : null}
            {endInterviewError ? <p>{endInterviewError}</p> : null}
            {liveInterview.transcriptFilePath ? <p>Transcript file: {liveInterview.transcriptFilePath}</p> : null}
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
