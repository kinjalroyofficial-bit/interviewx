import { useEffect, useRef, useState } from 'react'
import { getLastOpenAIPayload, previewInterviewPrompt } from '../../../api'

const BROWSE_TOPICS = ['SQL', 'Python', 'Java']
const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced']
const MODE_OPTIONS = [
  {
    value: 'Free-Flowing - Conversational',
    description: 'Dynamically generates a progressive flow of questions based on the candidate’s profile. The interview evolves naturally with adaptive depth and follow-ups.',
    purpose: 'Builds confidence in open-ended interviews and helps candidates steer discussion toward their strengths.'
  },
  {
    value: 'Topic Oriented - Domain-Focused',
    description: 'The interview is tailored to selected technologies or concepts so all questions remain within the chosen scope.',
    purpose: 'Improves depth and articulation in specific technical domains.'
  },
  {
    value: 'Exclusively Coding',
    description: 'Focuses on coding challenges and follow-ups that test approach, logic, and implementation quality.',
    purpose: 'Assesses practical coding, problem-solving, and technical communication under interview constraints.'
  },
  {
    value: 'Pro-Mode - Full-Stack',
    description: 'Combines technical, coding, and situational questions in a profile-contextualized full interview flow.',
    purpose: 'Provides a holistic readiness check across depth, coding proficiency, and communication.'
  },
  {
    value: 'Differential - CV & JD Based',
    description: 'Uses candidate context and role intent to generate tailored discussions around projects, strengths, and potential gaps.',
    purpose: 'Evaluates candidate-role fit and encourages structured self-reflection for targeted opportunities.'
  }
]

export default function CurrentInterviewCard({ activeInterview, username, onSetupChange }) {
  const storageKey = `interviewx-setup-${username || 'guest'}`
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false)
  const [isModeModalOpen, setIsModeModalOpen] = useState(false)
  const [inputType, setInputType] = useState('text')
  const [selectedMode, setSelectedMode] = useState(MODE_OPTIONS[0].value)
  const [pendingMode, setPendingMode] = useState(MODE_OPTIONS[0].value)
  const activeTopics = Array.isArray(activeInterview?.topics) ? activeInterview.topics : []
  const defaultDifficulty = activeInterview?.difficulty || 'Intermediate'
  const [topicSelections, setTopicSelections] = useState(() => (
    Object.fromEntries(
      BROWSE_TOPICS.map((topic) => [topic, {
        selected: activeTopics.includes(topic),
        difficulty: defaultDifficulty
      }])
    )
  ))
  const [appliedTopics, setAppliedTopics] = useState(() => (
    []
  ))
  const topicScrollerRef = useRef(null)
  const [isPromptPreviewOpen, setIsPromptPreviewOpen] = useState(false)
  const [promptPreviewText, setPromptPreviewText] = useState('')
  const [promptPreviewStatus, setPromptPreviewStatus] = useState('')
  const [isOpenAIPayloadOpen, setIsOpenAIPayloadOpen] = useState(false)
  const [openAIPayloadStatus, setOpenAIPayloadStatus] = useState('')
  const [openAIPayloadText, setOpenAIPayloadText] = useState('')
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const startScrollLeftRef = useRef(0)

  const handleTopicMouseDown = (event) => {
    const scroller = topicScrollerRef.current
    if (!scroller) return
    isDraggingRef.current = true
    dragStartXRef.current = event.pageX - scroller.offsetLeft
    startScrollLeftRef.current = scroller.scrollLeft
    scroller.classList.add('is-dragging')
  }

  const handleTopicMouseMove = (event) => {
    if (!isDraggingRef.current) return
    const scroller = topicScrollerRef.current
    if (!scroller) return
    event.preventDefault()
    const x = event.pageX - scroller.offsetLeft
    const walk = x - dragStartXRef.current
    scroller.scrollLeft = startScrollLeftRef.current - walk
  }

  const handleTopicMouseUp = () => {
    const scroller = topicScrollerRef.current
    isDraggingRef.current = false
    if (scroller) scroller.classList.remove('is-dragging')
  }

  const handleTopicToggle = (topic) => {
    setTopicSelections((currentSelections) => ({
      ...currentSelections,
      [topic]: {
        ...currentSelections[topic],
        selected: !currentSelections[topic].selected
      }
    }))
  }

  const handleDifficultyChange = (topic, difficulty) => {
    setTopicSelections((currentSelections) => ({
      ...currentSelections,
      [topic]: {
        ...currentSelections[topic],
        difficulty
      }
    }))
  }

  const handleBrowseSubmit = () => {
    const nextAppliedTopics = BROWSE_TOPICS
      .filter((topic) => topicSelections[topic].selected)
      .map((topic) => ({
        topic,
        difficulty: topicSelections[topic].difficulty
      }))

    setAppliedTopics(nextAppliedTopics)
    setIsBrowseModalOpen(false)
  }

  const openModeModal = () => {
    setPendingMode(selectedMode)
    setIsModeModalOpen(true)
  }

  const handleModeSubmit = () => {
    setSelectedMode(pendingMode)
    setIsModeModalOpen(false)
  }

  const handlePromptPreview = async () => {
    if (!username) {
      setPromptPreviewStatus('Username unavailable. Please log in again.')
      setIsPromptPreviewOpen(true)
      return
    }

    setPromptPreviewStatus('Generating prompt preview...')
    setIsPromptPreviewOpen(true)
    try {
      const data = await previewInterviewPrompt({
        username,
        selected_mode: selectedMode,
        selected_topics: appliedTopics.map((topicConfig) => ({
          topic: topicConfig.topic,
          difficulty: topicConfig.difficulty
        }))
      })
      setPromptPreviewText(data.prompt)
      setPromptPreviewStatus(`Prompt generated. File: ${data.prompt_file_path}`)
    } catch (error) {
      setPromptPreviewText('')
      setPromptPreviewStatus(error.message || 'Unable to generate prompt preview.')
    }
  }

  const handleLastPayloadDebug = async () => {
    setOpenAIPayloadStatus('Fetching latest OpenAI payload...')
    setOpenAIPayloadText('')
    setIsOpenAIPayloadOpen(true)
    try {
      const data = await getLastOpenAIPayload()
      setOpenAIPayloadText(JSON.stringify(data, null, 2))
      setOpenAIPayloadStatus('Latest payload fetched.')
    } catch (error) {
      setOpenAIPayloadStatus(error.message || 'Unable to fetch latest OpenAI payload.')
    }
  }

  useEffect(() => {
    try {
      const savedValue = localStorage.getItem(storageKey)
      if (!savedValue) return
      const parsed = JSON.parse(savedValue)
      if (typeof parsed?.selectedMode === 'string') {
        setSelectedMode(parsed.selectedMode)
        setPendingMode(parsed.selectedMode)
      }
      if (Array.isArray(parsed?.selectedTopics)) {
        const nextTopics = parsed.selectedTopics
          .filter((entry) => entry && typeof entry.topic === 'string' && typeof entry.difficulty === 'string')
          .map((entry) => ({ topic: entry.topic, difficulty: entry.difficulty }))
        setAppliedTopics(nextTopics)
        setTopicSelections((currentSelections) => ({
          ...currentSelections,
          ...Object.fromEntries(
            BROWSE_TOPICS.map((topic) => {
              const matched = nextTopics.find((entry) => entry.topic === topic)
              return [topic, {
                selected: Boolean(matched),
                difficulty: matched?.difficulty || currentSelections[topic]?.difficulty || defaultDifficulty
              }]
            })
          )
        }))
      }
    } catch {
      // Ignore malformed local storage values and continue with defaults.
    }
  }, [storageKey, defaultDifficulty])

  useEffect(() => {
    if (!onSetupChange) return
    onSetupChange({
      selectedMode,
      selectedTopics: appliedTopics.map((topicConfig) => ({
        topic: topicConfig.topic,
        difficulty: topicConfig.difficulty
      }))
    })
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        selectedMode,
        selectedTopics: appliedTopics
      })
    )
  }, [selectedMode, appliedTopics, onSetupChange, storageKey])

  return (
    <section className="ic3-panel ic3-current-card" aria-label="Current interview info">
      <h3>Current Interview</h3>

      <div className="ic3-kv-row ic3-kv-row-topic">
        <span>Topic</span>
        <div
          ref={topicScrollerRef}
          className="ic3-topic-values"
          aria-label="Topics"
          onMouseDown={handleTopicMouseDown}
          onMouseMove={handleTopicMouseMove}
          onMouseUp={handleTopicMouseUp}
          onMouseLeave={handleTopicMouseUp}
        >
          {appliedTopics.length > 0 ? (
            appliedTopics.map((topicConfig) => (
              <span key={topicConfig.topic} className="ic3-pill">
                {topicConfig.topic} · {topicConfig.difficulty}
              </span>
            ))
          ) : (
            <span className="ic3-pill">Click “Browse Topics” to choose your interview topics.</span>
          )}
        </div>
      </div>

      <div className="ic3-kv-row ic3-kv-row-mode">
        <span>Mode</span>
        <button type="button" className="ic3-pill ic3-mode-pill" onClick={openModeModal}>{selectedMode}</button>
      </div>

      <div className="ic3-kv-row ic3-kv-row-input-type">
        <span>Input Type</span>
        <div className="ic3-input-toggle" role="group" aria-label="Input type">
          <button
            type="button"
            className={`ic3-input-option ${inputType === 'text' ? 'is-active' : ''}`}
            onClick={() => setInputType('text')}
          >
            Text
          </button>
          <button
            type="button"
            className={`ic3-input-option ${inputType === 'voice' ? 'is-active' : ''}`}
            onClick={() => setInputType('voice')}
          >
            Voice
          </button>
        </div>
      </div>

      <button type="button" className="ic3-browse-button" onClick={() => setIsBrowseModalOpen(true)}>Browse Topics</button>
      <button type="button" className="ic3-browse-button ic3-debug-button" onClick={handlePromptPreview}>Debug Prompt</button>
      <button type="button" className="ic3-browse-button ic3-debug-button" onClick={handleLastPayloadDebug}>Debug Last OpenAI Call</button>

      {isBrowseModalOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsBrowseModalOpen(false)}>
          <section className="ic3-modal" role="dialog" aria-modal="true" aria-label="Browse topics" onClick={(event) => event.stopPropagation()}>
            <h4>Browse Topics</h4>
            <div className="ic3-modal-fieldset" role="group" aria-label="Interview topics">
              {BROWSE_TOPICS.map((topic) => (
                <div key={topic} className="ic3-modal-topic-row">
                  <label className="ic3-modal-checkbox">
                    <input
                      type="checkbox"
                      checked={topicSelections[topic].selected}
                      onChange={() => handleTopicToggle(topic)}
                    />
                    <span>{topic}</span>
                  </label>
                  <select
                    className="ic3-modal-select"
                    value={topicSelections[topic].difficulty}
                    onChange={(event) => handleDifficultyChange(topic, event.target.value)}
                  >
                    {DIFFICULTY_OPTIONS.map((difficultyOption) => (
                      <option key={difficultyOption} value={difficultyOption}>
                        {difficultyOption}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="ic3-modal-actions">
              <button type="button" className="ic3-modal-close" onClick={() => setIsBrowseModalOpen(false)}>Close</button>
              <button type="button" className="ic3-modal-submit" onClick={handleBrowseSubmit}>Submit</button>
            </div>
          </section>
        </div>
      ) : null}

      {isModeModalOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsModeModalOpen(false)}>
          <section className="ic3-modal ic3-mode-modal" role="dialog" aria-modal="true" aria-label="Interview modes" onClick={(event) => event.stopPropagation()}>
            <h4>Select Interview Mode</h4>
            <div className="ic3-mode-head">
              <span>Mode</span>
              <span>Description</span>
              <span>Purpose</span>
            </div>
            <div className="ic3-mode-list" role="radiogroup" aria-label="Interview mode options">
              {MODE_OPTIONS.map((modeOption) => (
                <label key={modeOption.value} className="ic3-mode-item">
                  <input
                    type="radio"
                    name="interview-mode"
                    checked={pendingMode === modeOption.value}
                    onChange={() => setPendingMode(modeOption.value)}
                  />
                  <strong>{modeOption.value}</strong>
                  <p>{modeOption.description}</p>
                  <p>{modeOption.purpose}</p>
                </label>
              ))}
            </div>
            <div className="ic3-modal-actions">
              <button type="button" className="ic3-modal-close" onClick={() => setIsModeModalOpen(false)}>Cancel</button>
              <button type="button" className="ic3-modal-submit" onClick={handleModeSubmit}>Submit</button>
            </div>
          </section>
        </div>
      ) : null}

      {isPromptPreviewOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsPromptPreviewOpen(false)}>
          <section className="ic3-modal ic3-prompt-modal" role="dialog" aria-modal="true" aria-label="Prompt preview" onClick={(event) => event.stopPropagation()}>
            <h4>Prompt Preview</h4>
            <p className="ic3-prompt-status">{promptPreviewStatus}</p>
            <textarea
              className="ic3-prompt-textarea"
              value={promptPreviewText}
              readOnly
              aria-label="Generated prompt preview"
            />
            <div className="ic3-modal-actions">
              <button type="button" className="ic3-modal-close" onClick={() => setIsPromptPreviewOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}

      {isOpenAIPayloadOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsOpenAIPayloadOpen(false)}>
          <section className="ic3-modal ic3-prompt-modal" role="dialog" aria-modal="true" aria-label="OpenAI payload preview" onClick={(event) => event.stopPropagation()}>
            <h4>Last OpenAI Payload</h4>
            <p className="ic3-prompt-status">{openAIPayloadStatus}</p>
            <textarea
              className="ic3-prompt-textarea"
              value={openAIPayloadText}
              readOnly
              aria-label="Last OpenAI payload"
            />
            <div className="ic3-modal-actions">
              <button type="button" className="ic3-modal-close" onClick={() => setIsOpenAIPayloadOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
