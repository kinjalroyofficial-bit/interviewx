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
