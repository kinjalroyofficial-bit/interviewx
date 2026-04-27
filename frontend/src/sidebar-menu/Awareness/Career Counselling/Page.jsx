import { useEffect, useMemo, useState } from 'react'
import { getUserPreferences, updateUserPreferences } from '../../../api'

const LEARNING_SPEED_OPTIONS = ['slow', 'moderate', 'fast']
const RISK_APPETITE_OPTIONS = ['low', 'medium', 'high']
const FINANCIAL_URGENCY_OPTIONS = ['low', 'medium', 'high']

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

export default function AwarenessCareerCounsellingPage({ username = '' }) {
  const [form, setForm] = useState({
    previous_tech_related_skill: '',
    learning_speed: 'moderate',
    risk_appetite: 'medium',
    financial_urgency: 'medium',
    hours_per_week: 10,
    interests: ''
  })
  const [status, setStatus] = useState('')
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
          learning_speed: preferences.learning_speed || 'moderate',
          risk_appetite: preferences.risk_appetite || 'medium',
          financial_urgency: preferences.financial_urgency || 'medium',
          hours_per_week: Number(preferences.hours_per_week || 10),
          interests: preferences.interests || ''
        }))
      } catch (error) {
        if (!cancelled) {
          setStatus(error.message || 'Unable to load preferences.')
        }
      }
    }

    loadPreferences()
    return () => {
      cancelled = true
    }
  }, [username])

  function updateField(name, value) {
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!canSave) {
      setStatus('Missing username. Please login again.')
      return
    }

    const preferenceJson = {
      previous_tech_related_skill: form.previous_tech_related_skill.trim(),
      learning_speed: form.learning_speed,
      risk_appetite: form.risk_appetite,
      financial_urgency: form.financial_urgency,
      hours_per_week: Number(form.hours_per_week),
      interests: form.interests.trim()
    }

    setStatus('Saving...')
    try {
      await updateUserPreferences({
        username,
        preferences: preferenceJson
      })
      setStatus('Preferences saved successfully.')
    } catch (error) {
      setStatus(error.message || 'Unable to save preferences.')
    }
  }

  return (
    <main className="career-counselling-page">
      <section className="career-counselling-card">
        <h2>Preferences</h2>
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

          <ToggleGroup
            label="learning_speed"
            options={LEARNING_SPEED_OPTIONS}
            value={form.learning_speed}
            onChange={(value) => updateField('learning_speed', value)}
          />

          <ToggleGroup
            label="risk_appetite"
            options={RISK_APPETITE_OPTIONS}
            value={form.risk_appetite}
            onChange={(value) => updateField('risk_appetite', value)}
          />

          <ToggleGroup
            label="financial_urgency"
            options={FINANCIAL_URGENCY_OPTIONS}
            value={form.financial_urgency}
            onChange={(value) => updateField('financial_urgency', value)}
          />

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

      <section className="career-counselling-card">
        <h2>Career Counselling Chatbot</h2>
        <p>Chatbot section placeholder (to be implemented).</p>
      </section>
    </main>
  )
}
