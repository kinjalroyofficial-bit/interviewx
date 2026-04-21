const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function authRequest(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const rawBody = await response.text()
    let detail = ''
    try {
      const parsed = rawBody ? JSON.parse(rawBody) : {}
      detail = parsed.detail || parsed.message || ''
    } catch {
      detail = rawBody
    }

    const fallback = `Authentication request failed (${response.status})`
    throw new Error(detail ? `${fallback}: ${detail}` : fallback)
  }

  return response.json()
}

export function signup(payload) {
  return authRequest('/auth/signup', payload)
}

export function login(payload) {
  return authRequest('/auth/login', payload)
}

export function googleLogin(idToken) {
  return authRequest('/auth/google', { id_token: idToken })
}

export async function getUserProfile(username) {
  const query = new URLSearchParams({ username })
  const response = await fetch(`${API_BASE_URL}/users/profile?${query.toString()}`)

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to fetch user profile (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function updateUserProfile(payload) {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to update user profile (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function previewInterviewPrompt(payload) {
  const response = await fetch(`${API_BASE_URL}/interview/prompt/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to generate interview prompt (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function startInterview(payload) {
  const response = await fetch(`${API_BASE_URL}/interview/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to start interview (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function nextInterviewQuestion(payload) {
  const response = await fetch(`${API_BASE_URL}/interview/next-question`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to fetch next question (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function getLastOpenAIPayload() {
  const response = await fetch(`${API_BASE_URL}/interview/debug/last-openai-payload`)

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to fetch OpenAI payload (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function getLastOpenAIResponse() {
  const response = await fetch(`${API_BASE_URL}/interview/debug/last-openai-response`)

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to fetch OpenAI response (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function endInterview(payload) {
  const response = await fetch(`${API_BASE_URL}/interview/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to end interview (${response.status}): ${detail}`)
  }

  return response.json()
}

export async function getInterviewHistory(username) {
  const query = new URLSearchParams({ username })
  const attemptedUrls = [`${API_BASE_URL}/interview/history?${query.toString()}`]
  if (API_BASE_URL === '/api') {
    attemptedUrls.push(`/interview/history?${query.toString()}`)
  }

  let lastFailure = ''
  for (const url of attemptedUrls) {
    const response = await fetch(url)
    const rawBody = await response.text()
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      lastFailure = `url=${url} status=${response.status} body=${rawBody.slice(0, 180)}`
      continue
    }

    if (!contentType.includes('application/json')) {
      lastFailure = `url=${url} status=${response.status} contentType=${contentType || 'unknown'} body=${rawBody.slice(0, 180)}`
      continue
    }

    try {
      return rawBody ? JSON.parse(rawBody) : { interviews: [] }
    } catch (error) {
      const parseError = error instanceof Error ? error.message : 'Unknown JSON parse error'
      lastFailure = `url=${url} status=${response.status} parseError=${parseError} body=${rawBody.slice(0, 180)}`
    }
  }

  throw new Error(`Failed to fetch interview history. ${lastFailure}`)
}
