import { useRef, useState } from 'react'

const BROWSE_TOPICS = ['SQL', 'Python', 'Java']
const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced']

export default function CurrentInterviewCard({ activeInterview }) {
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false)
  const [inputType, setInputType] = useState('text')
  const [selectedTopics, setSelectedTopics] = useState(BROWSE_TOPICS)
  const [selectedDifficulty, setSelectedDifficulty] = useState('Intermediate')
  const topicScrollerRef = useRef(null)
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
    setSelectedTopics((currentTopics) => (
      currentTopics.includes(topic)
        ? currentTopics.filter((currentTopic) => currentTopic !== topic)
        : [...currentTopics, topic]
    ))
  }

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
          {activeInterview.topics.map((topic) => (
            <span key={topic} className="ic3-pill">{topic}</span>
          ))}
        </div>
      </div>

      <div className="ic3-kv-row-double">
        <div className="ic3-kv-row">
          <span>Difficulty</span>
          <span className="ic3-pill">{activeInterview.difficulty}</span>
        </div>
        <span className="ic3-row-divider" aria-hidden="true" />
        <div className="ic3-kv-row">
          <span>Mode</span>
          <span className="ic3-pill">{activeInterview.mode}</span>
        </div>
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

      {isBrowseModalOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsBrowseModalOpen(false)}>
          <section className="ic3-modal" role="dialog" aria-modal="true" aria-label="Browse topics" onClick={(event) => event.stopPropagation()}>
            <h4>Browse Topics</h4>
            <div className="ic3-modal-fieldset" role="group" aria-label="Interview topics">
              {BROWSE_TOPICS.map((topic) => (
                <label key={topic} className="ic3-modal-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic)}
                    onChange={() => handleTopicToggle(topic)}
                  />
                  <span>{topic}</span>
                </label>
              ))}
            </div>

            <label className="ic3-modal-label" htmlFor="ic3-browse-difficulty">Difficulty</label>
            <select
              id="ic3-browse-difficulty"
              className="ic3-modal-select"
              value={selectedDifficulty}
              onChange={(event) => setSelectedDifficulty(event.target.value)}
            >
              {DIFFICULTY_OPTIONS.map((difficultyOption) => (
                <option key={difficultyOption} value={difficultyOption}>
                  {difficultyOption}
                </option>
              ))}
            </select>
            <button type="button" className="ic3-modal-close" onClick={() => setIsBrowseModalOpen(false)}>Close</button>
          </section>
        </div>
      ) : null}
    </section>
  )
}
