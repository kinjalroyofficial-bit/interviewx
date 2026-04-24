import { useEffect, useMemo, useState } from 'react'
import { getQuantumQuestPerformance, getQuantumQuestQuestions, submitQuantumQuest } from '../../api'

const STORAGE_KEY = 'interviewx-user'

export default function QuantumQuestPage() {
  const username = localStorage.getItem(STORAGE_KEY) || ''
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [questionCount, setQuestionCount] = useState(5)
  const [questions, setQuestions] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [quizResult, setQuizResult] = useState(null)
  const [performance, setPerformance] = useState([])
  const [availableTopics, setAvailableTopics] = useState([])
  const [availableDifficulties, setAvailableDifficulties] = useState([])
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const normalizedTopics = useMemo(() => {
    const seen = new Set()
    return availableTopics.filter((item) => {
      const key = String(item || '').trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [availableTopics])

  const normalizedDifficulties = useMemo(() => {
    const seen = new Set()
    return availableDifficulties
      .map((item) => String(item || '').trim())
      .filter((item) => {
        const key = item.toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.localeCompare(b))
  }, [availableDifficulties])

  async function loadPerformance() {
    if (!username) return
    try {
      const payload = await getQuantumQuestPerformance(username)
      setPerformance(payload.attempts || [])
    } catch {
      setPerformance([])
    }
  }

  async function loadQuestions() {
    setIsLoading(true)
    setStatus('Loading quiz questions...')
    setQuizResult(null)
    try {
      const payload = await getQuantumQuestQuestions({ topic, difficulty, limit: questionCount })
      const nextQuestions = payload.questions || []
      setQuestions(nextQuestions)
      setAvailableTopics(payload.available_topics || [])
      setAvailableDifficulties(payload.available_difficulties || [])
      setSelectedAnswers({})
      setActiveIndex(0)
      setStatus(nextQuestions.length ? `Loaded ${nextQuestions.length} questions.` : 'No questions found for this filter.')
    } catch (error) {
      setStatus(error.message || 'Failed to load quiz questions.')
      setQuestions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
    loadPerformance()
  }, [])

  const activeQuestion = questions[activeIndex]
  const answeredCount = useMemo(
    () => Object.values(selectedAnswers).filter((value) => Number.isInteger(value)).length,
    [selectedAnswers]
  )

  async function handleSubmitQuiz() {
    if (!username || !questions.length) return
    const unanswered = questions.filter((item) => !selectedAnswers[item.question_id])
    if (unanswered.length) {
      setStatus(`Please answer all questions (${unanswered.length} left).`)
      return
    }

    setIsLoading(true)
    setStatus('Submitting quiz...')
    try {
      const payload = await submitQuantumQuest({
        username,
        topic,
        difficulty,
        question_ids: questions.map((item) => item.question_id),
        selected_answers: questions.map((item) => selectedAnswers[item.question_id])
      })
      setQuizResult(payload)
      setStatus('Quiz submitted successfully.')
      await loadPerformance()
    } catch (error) {
      setStatus(error.message || 'Failed to submit quiz.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="qq-wrapper">
      <div className="qq-header-row">
        <div>
          <h2>Quantum Quest</h2>
          <p className="qq-subtitle">MCQ practice arena with instant scoring and explanations.</p>
        </div>
        <button type="button" className="qq-button qq-button-secondary" onClick={loadQuestions} disabled={isLoading}>Refresh Questions</button>
      </div>

      <div className="qq-filters">
        <label className="qq-field">
          <span>Topic</span>
          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="">All topics</option>
            {normalizedTopics.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="qq-field">
          <span>Difficulty</span>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">All levels</option>
            {normalizedDifficulties.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="qq-field">
          <span>Question Count</span>
          <select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>
            {[5, 10, 15, 20].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>

        <button type="button" className="qq-button qq-button-primary" onClick={loadQuestions} disabled={isLoading}>Start Quiz</button>
      </div>

      {status ? <p className="qq-status">{status}</p> : null}

      <div className="qq-content-grid">
        {activeQuestion ? (
          <article className="qq-card">
            <p className="qq-progress">Question {activeIndex + 1} / {questions.length} • Answered {answeredCount}</p>
            <h3>{activeQuestion.question_text}</h3>
            <ul>
              {activeQuestion.options.map((option, index) => {
                const optionNumber = index + 1
                return (
                  <li key={`${activeQuestion.question_id}-${optionNumber}`}>
                    <label>
                      <input
                        type="radio"
                        name={`question-${activeQuestion.question_id}`}
                        checked={selectedAnswers[activeQuestion.question_id] === optionNumber}
                        onChange={() => setSelectedAnswers((prev) => ({ ...prev, [activeQuestion.question_id]: optionNumber }))}
                      />
                      <span>{option}</span>
                    </label>
                  </li>
                )
              })}
            </ul>

            <div className="qq-nav-row">
              <button className="qq-button qq-button-secondary" type="button" disabled={activeIndex === 0} onClick={() => setActiveIndex((prev) => prev - 1)}>Previous</button>
              {activeIndex < questions.length - 1 ? (
                <button className="qq-button qq-button-primary" type="button" onClick={() => setActiveIndex((prev) => prev + 1)}>Next</button>
              ) : (
                <button className="qq-button qq-button-primary" type="button" onClick={handleSubmitQuiz} disabled={isLoading}>Submit Quiz</button>
              )}
            </div>
          </article>
        ) : (
          <article className="qq-card qq-card-empty">
            <h3>No active quiz</h3>
            <p>Use the filters above and click Start Quiz to begin.</p>
          </article>
        )}

        <aside className="qq-side-stack">
          {quizResult ? (
            <section className="qq-result-card">
              <h3>Latest Result</h3>
              <p>Score: <strong>{quizResult.score_percentage}%</strong> ({quizResult.correct_answers}/{quizResult.total_questions})</p>
              <details>
                <summary>View explanations</summary>
                <ul>
                  {quizResult.results.map((item) => (
                    <li key={`result-${item.question_id}`}>
                      Q#{item.question_id}: {item.is_correct ? 'Correct' : 'Incorrect'} | Correct option: {item.correct_answer}
                      {item.explanation ? ` | ${item.explanation}` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          ) : null}

          <section className="qq-history-card">
            <h3>Your Recent Quantum Quest Scores</h3>
            {performance.length ? (
              <ul>
                {performance.map((item) => (
                  <li key={item.attempt_id}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown time'} - {item.score_percentage}% ({item.correct_answers}/{item.total_questions})
                    {item.topic ? ` | ${item.topic}` : ''}
                    {item.difficulty ? ` | ${item.difficulty}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No attempts yet.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  )
}
