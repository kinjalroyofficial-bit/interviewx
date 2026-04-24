import { useEffect, useMemo, useState } from 'react'
import { getQuantumQuestPerformance, getQuantumQuestQuestions, submitQuantumQuest } from '../../api'

const STORAGE_KEY = 'interviewx-user'
const PRE_CODE_BLOCK_PATTERN = /<pre>\s*(?:<code>)?([\s\S]*?)(?:<\/code>)?\s*<\/pre>/i

export default function QuantumQuestPage() {
  const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20]
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
  const questionCountIndex = Math.max(0, QUESTION_COUNT_OPTIONS.indexOf(questionCount))
  const performanceInsights = useMemo(() => {
    if (!performance.length) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        strongestTopic: 'N/A',
        strongestDifficulty: 'N/A'
      }
    }

    const totalAttempts = performance.length
    const averageScore = Math.round(performance.reduce((sum, item) => sum + Number(item.score_percentage || 0), 0) / totalAttempts)
    const bestScore = Math.max(...performance.map((item) => Number(item.score_percentage || 0)))
    const topicScores = new Map()
    const difficultyScores = new Map()

    performance.forEach((item) => {
      const score = Number(item.score_percentage || 0)
      const topicKey = item.topic || 'Mixed'
      const difficultyKey = item.difficulty || 'Mixed'
      topicScores.set(topicKey, (topicScores.get(topicKey) || { total: 0, count: 0 }))
      difficultyScores.set(difficultyKey, (difficultyScores.get(difficultyKey) || { total: 0, count: 0 }))
      const topicBucket = topicScores.get(topicKey)
      topicBucket.total += score
      topicBucket.count += 1
      const difficultyBucket = difficultyScores.get(difficultyKey)
      difficultyBucket.total += score
      difficultyBucket.count += 1
    })

    const strongestTopic = [...topicScores.entries()]
      .map(([topicName, meta]) => ({ topicName, score: meta.total / meta.count }))
      .sort((a, b) => b.score - a.score)[0]?.topicName || 'N/A'

    const strongestDifficulty = [...difficultyScores.entries()]
      .map(([difficultyName, meta]) => ({ difficultyName, score: meta.total / meta.count }))
      .sort((a, b) => b.score - a.score)[0]?.difficultyName || 'N/A'

    return { totalAttempts, averageScore, bestScore, strongestTopic, strongestDifficulty }
  }, [performance])

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

  function renderQuestionText(rawQuestionText) {
    const raw = String(rawQuestionText || '')
    const normalized = raw.replace(/<br\s*\/?>/gi, '\n')
    const codeBlockMatch = normalized.match(PRE_CODE_BLOCK_PATTERN)

    if (!codeBlockMatch) {
      return <p className="qq-question-body">{normalized}</p>
    }

    const matchText = codeBlockMatch[0]
    const codeText = String(codeBlockMatch[1] || '').replace(/<\/?code>/gi, '').trim()
    const introText = normalized.slice(0, codeBlockMatch.index).trim()
    const trailingText = normalized.slice((codeBlockMatch.index || 0) + matchText.length).replace(/<\/?code>/gi, '').trim()

    return (
      <>
        {introText ? <p className="qq-question-body">{introText}</p> : null}
        {codeText ? (
          <pre className="qq-question-code-box">
            <code>{codeText}</code>
          </pre>
        ) : null}
        {trailingText ? <p className="qq-question-body">{trailingText}</p> : null}
      </>
    )
  }

  return (
    <section className="qq-wrapper">
      <div className="qq-header-row">
        <div>
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
          <div className="qq-range-wrap">
            <input
              type="range"
              min={0}
              max={QUESTION_COUNT_OPTIONS.length - 1}
              step={1}
              value={questionCountIndex}
              onChange={(event) => setQuestionCount(QUESTION_COUNT_OPTIONS[Number(event.target.value)])}
            />
            <div className="qq-range-values" aria-hidden="true">
              {QUESTION_COUNT_OPTIONS.map((count) => (
                <span key={count} className={count === questionCount ? 'is-active' : ''}>{count}</span>
              ))}
            </div>
          </div>
        </label>

        <button type="button" className="qq-button qq-button-primary" onClick={loadQuestions} disabled={isLoading}>Start Quiz</button>
      </div>

      {status ? <p className="qq-status">{status}</p> : null}

      <div className="qq-content-grid">
        {activeQuestion ? (
          <article className="qq-card">
            <p className="qq-progress">Question {activeIndex + 1} / {questions.length} • Answered {answeredCount}</p>
            <div className="qq-question-text">{renderQuestionText(activeQuestion.question_text)}</div>
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

          <section className="qq-insights-card">
            <h3>Performance Insights</h3>
            <div className="qq-insight-grid">
              <p><span>Attempts</span><strong>{performanceInsights.totalAttempts}</strong></p>
              <p><span>Avg Score</span><strong>{performanceInsights.averageScore}%</strong></p>
              <p><span>Best Score</span><strong>{performanceInsights.bestScore}%</strong></p>
              <p><span>Strongest Topic</span><strong>{performanceInsights.strongestTopic}</strong></p>
              <p><span>Strongest Level</span><strong>{performanceInsights.strongestDifficulty}</strong></p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}
