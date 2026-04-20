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
