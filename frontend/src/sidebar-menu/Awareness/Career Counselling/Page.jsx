import { useEffect, useMemo, useState } from 'react'
import {
  endCareerCounsellingSession,
  getCareerCounsellingHistory,
  getCareerCounsellingOverview,
  getUserPreferences,
  sendCareerCounsellingMessage,
  startCareerCounsellingSession,
  updateUserPreferences
} from '../../../api'

const LEARNING_SPEED_OPTIONS = ['slow', 'moderate', 'fast']
const RISK_APPETITE_OPTIONS = ['low', 'medium', 'high']
const FINANCIAL_URGENCY_OPTIONS = ['low', 'medium', 'high']
const LANGUAGE_OPTIONS = [
  { value: 'en-US', flag: '🇺🇸', label: 'English (US)' },
  { value: 'en-GB', flag: '🇬🇧', label: 'English (UK)' },
  { value: 'hi-IN', flag: '🇮🇳', label: 'Hindi' },
  { value: 'es-ES', flag: '🇪🇸', label: 'Spanish' },
  { value: 'fr-FR', flag: '🇫🇷', label: 'French' },
  { value: 'de-DE', flag: '🇩🇪', label: 'German' },
  { value: 'pt-BR', flag: '🇧🇷', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', flag: '🇯🇵', label: 'Japanese' }
]

function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div className="career-counselling-field">
      <span>{label}</span>
      <div className="career-counselling-toggle-group" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`career-counselling-toggle ${value === option ? 'is-active' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AwarenessCareerCounsellingPage({ username = '', onCreditsUpdated = () => {} }) {
  const [form, setForm] = useState({
    previous_tech_related_skill: '',
    preferred_language: 'en-US',
    learning_speed: 'moderate',
    risk_appetite: 'medium',
    financial_urgency: 'medium',
    hours_per_week: 10,
    interests: ''
  })
  const [status, setStatus] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatStatus, setChatStatus] = useState('')
  const [overview, setOverview] = useState('')
  const [overviewJson, setOverviewJson] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [historyStatus, setHistoryStatus] = useState('')
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState('')
  const canGenerateOverview = Boolean(sessionId) && messages.some((item) => item.role === 'user')

  const canSave = useMemo(() => Boolean(username), [username])

  useEffect(() => {
    if (!username) return

    let cancelled = false
    async function loadPreferences() {
      try {
        const payload = await getUserPreferences(username)
        const preferences = payload?.preferences || {}
        if (cancelled) return
        setForm((prev) => ({
          ...prev,
          previous_tech_related_skill: preferences.previous_tech_related_skill || '',
          preferred_language: preferences.preferred_language || 'en-US',
          learning_speed: preferences.learning_speed || 'moderate',
          risk_appetite: preferences.risk_appetite || 'medium',
          financial_urgency: preferences.financial_urgency || 'medium',
          hours_per_week: Number(preferences.hours_per_week || 10),
          interests: preferences.interests || ''
        }))
      } catch (error) {
        if (!cancelled) setStatus(error.message || 'Unable to load preferences.')
      }
    }

    loadPreferences()
    return () => {
      cancelled = true
    }
  }, [username])

  useEffect(() => {
    if (!username) return
    let cancelled = false

    async function loadHistory() {
      try {
        setHistoryStatus('Loading counselling history...')
        const payload = await getCareerCounsellingHistory(username)
        if (cancelled) return
        const consultations = payload?.consultations || []
        setHistoryItems(consultations)
        setHistoryStatus(consultations.length ? '' : 'No counselling history found.')
      } catch (error) {
        if (!cancelled) {
          setHistoryStatus(error.message || 'Unable to load counselling history.')
        }
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [username])

  function updateField(name, value) {
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function parseOverviewPayload(rawText) {
    try {
      const parsed = JSON.parse(rawText)
      if (parsed && typeof parsed === 'object') return parsed
      return null
    } catch {
      return null
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!canSave) {
      setStatus('Missing username. Please login again.')
      return
    }

    const preferenceJson = {
      previous_tech_related_skill: form.previous_tech_related_skill.trim(),
      preferred_language: form.preferred_language,
      learning_speed: form.learning_speed,
      risk_appetite: form.risk_appetite,
      financial_urgency: form.financial_urgency,
      hours_per_week: Number(form.hours_per_week),
      interests: form.interests.trim()
    }

    setStatus('Saving...')
    try {
      await updateUserPreferences({ username, preferences: preferenceJson })
      setStatus('Preferences saved successfully.')
    } catch (error) {
      setStatus(error.message || 'Unable to save preferences.')
    }
  }

  async function handleStartSession() {
    if (!canSave) {
      setChatStatus('Missing username. Please login again.')
      return
    }

    setChatStatus('Starting session...')
    try {
      const payload = await startCareerCounsellingSession({ username })
      setSessionId(payload.session_id)
      setMessages([{ role: 'assistant', content: payload.assistant_message }])
      setOverview('')
      setOverviewJson(null)
      setChatStatus('Counselling session started.')
    } catch (error) {
      setChatStatus(error.message || 'Unable to start session.')
    }
  }

  async function handleSendMessage() {
    const message = chatInput.trim()
    if (!sessionId) {
      setChatStatus('Please start your counselling session first.')
      return
    }
    if (!message) return

    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setChatInput('')
    setChatStatus('Sending...')

    try {
      const payload = await sendCareerCounsellingMessage({ session_id: sessionId, message })
      setMessages((prev) => [...prev, { role: 'assistant', content: payload.assistant_message }])
      setChatStatus('')
    } catch (error) {
      setChatStatus(error.message || 'Unable to send message.')
    }
  }

  async function handleGenerateOverview() {
    if (!sessionId) {
      setChatStatus('Please start your counselling session first.')
      return
    }

    setChatStatus('Generating career path overview...')
    try {
      await endCareerCounsellingSession({ session_id: sessionId })
      await onCreditsUpdated()
      const overviewPayload = await getCareerCounsellingOverview(sessionId)
      const nextOverview = overviewPayload.overview || ''
      setOverview(nextOverview)
      setOverviewJson(parseOverviewPayload(nextOverview))
      try {
        const historyPayload = await getCareerCounsellingHistory(username)
        const consultations = historyPayload?.consultations || []
        setHistoryItems(consultations)
        if (consultations.length > 0) {
          setSelectedHistorySessionId(consultations[0].session_id)
        }
      } catch {
        // Ignore history refresh failures so overview can still be shown.
      }
      setChatStatus('Overview generated.')
    } catch (error) {
      setChatStatus(error.message || 'Unable to generate overview.')
    }
  }

  function handleSelectHistoryItem(item) {
    setSelectedHistorySessionId(item.session_id)
    setOverview(item.overview || '')
    setOverviewJson(parseOverviewPayload(item.overview || ''))
  }

  return (
    <main className="career-counselling-page">
      <div className="career-counselling-left-column">
        <section className="career-counselling-card career-counselling-history-card">
          <h3>Counselling History</h3>
          {historyStatus ? <p className="career-counselling-status">{historyStatus}</p> : null}
          <div className="career-counselling-history-list">
            {historyItems.map((item) => (
              <button
                key={item.session_id}
                type="button"
                className={`career-counselling-history-item ${selectedHistorySessionId === item.session_id ? 'is-active' : ''}`}
                onClick={() => handleSelectHistoryItem(item)}
              >
                <strong>{new Date(item.created_at || Date.now()).toLocaleString()}</strong>
                <span>{item.session_id}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="career-counselling-card career-counselling-preferences-card">
          <div className="career-counselling-card-header">
            <h2>Preferences</h2>
            <label className="career-counselling-language-select">
              <span>Language</span>
              <select value={form.preferred_language} onChange={(event) => updateField('preferred_language', event.target.value)}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.flag} {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <form className="career-counselling-form" onSubmit={handleSave}>
            <label className="career-counselling-field">
              <span>Previous Tech Related Skill</span>
              <input
                type="text"
                value={form.previous_tech_related_skill}
                onChange={(event) => updateField('previous_tech_related_skill', event.target.value)}
                placeholder="e.g. React, SQL, Java"
              />
            </label>

            <ToggleGroup label="learning_speed" options={LEARNING_SPEED_OPTIONS} value={form.learning_speed} onChange={(value) => updateField('learning_speed', value)} />
            <ToggleGroup label="risk_appetite" options={RISK_APPETITE_OPTIONS} value={form.risk_appetite} onChange={(value) => updateField('risk_appetite', value)} />
            <ToggleGroup label="financial_urgency" options={FINANCIAL_URGENCY_OPTIONS} value={form.financial_urgency} onChange={(value) => updateField('financial_urgency', value)} />

            <label className="career-counselling-field">
              <span>hours_per_week: {form.hours_per_week}</span>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={form.hours_per_week}
                onChange={(event) => updateField('hours_per_week', Number(event.target.value))}
              />
            </label>

            <label className="career-counselling-field">
              <span>interests</span>
              <input
                type="text"
                value={form.interests}
                onChange={(event) => updateField('interests', event.target.value)}
                placeholder="e.g. AI products, fintech, cloud"
              />
            </label>

            <div className="career-counselling-actions">
              <button type="submit" disabled={!canSave}>Save</button>
              {status ? <p className="career-counselling-status">{status}</p> : null}
            </div>
          </form>
        </section>
      </div>

      <section className="career-counselling-card career-counselling-chat-panel">
        <div className="career-counselling-chat-header">
          <h2>My Counselor</h2>
          <button type="button" onClick={handleStartSession}>Start Session</button>
        </div>

        <div className="career-counselling-chat-thread">
          {messages.length ? messages.map((item, index) => (
            <article key={`${item.role}-${index}`} className={`career-counselling-chat-message is-${item.role}`}>
              <strong>{item.role === 'assistant' ? 'Counsellor' : 'You'}</strong>
              <p>{item.content}</p>
            </article>
          )) : <p className="career-counselling-chat-empty">Start a session to begin your counselling chat.</p>}
        </div>

        <div className="career-counselling-chat-composer">
          <input
            type="text"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Type your response..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <button type="button" onClick={handleSendMessage}>Send</button>
        </div>
        {canGenerateOverview ? (
          <button type="button" className="career-counselling-generate-floating" onClick={handleGenerateOverview}>
            Generate Overview
          </button>
        ) : null}
        {chatStatus ? <p className="career-counselling-status">{chatStatus}</p> : null}
      </section>

      <aside className="career-counselling-card career-counselling-overview-panel">
        <h3>Career Path Overview</h3>
        <div className="career-counselling-overview-content">
          {!overview ? <p>Overview will appear here after you click <strong>Generate Overview</strong>.</p> : null}
          {overviewJson ? (
            <div className="career-counselling-overview-structured">
              <p><strong>User:</strong> {overviewJson.user || '-'}</p>
              <p><strong>Preferred Language:</strong> {overviewJson.preferred_language || '-'}</p>
              <p><strong>Target Role:</strong> {overviewJson.target_role || '-'}</p>
              <p><strong>Current Status:</strong> {overviewJson.current_status || '-'}</p>
              <div>
                <strong>Key Goals:</strong>
                <ul>
                  {(overviewJson.key_goals || []).map((goal, index) => <li key={`goal-${index}`}>{goal}</li>)}
                </ul>
              </div>
              <div>
                <strong>Constraints:</strong>
                <ul>
                  <li><strong>Time:</strong> {overviewJson.constraints?.time || '-'}</li>
                  <li><strong>Financial:</strong> {overviewJson.constraints?.financial || '-'}</li>
                  <li><strong>Risk:</strong> {overviewJson.constraints?.risk || '-'}</li>
                </ul>
              </div>
              <div>
                <strong>Roadmap Phases:</strong>
                <ul>
                  {(overviewJson.roadmap?.phases || []).map((phase, index) => (
                    <li key={`phase-${index}`}>
                      <strong>{phase.phase_name || `Phase ${index + 1}`}</strong> ({phase.duration || 'N/A'})
                      <ul>
                        {(phase.focus || []).map((item, focusIndex) => <li key={`phase-${index}-focus-${focusIndex}`}>{item}</li>)}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
              <p><strong>User Confirmation:</strong> {String(overviewJson.user_confirmation)}</p>
            </div>
          ) : null}
          {overview && !overviewJson ? <p>{overview}</p> : null}
        </div>
      </aside>
    </main>
  )
}
