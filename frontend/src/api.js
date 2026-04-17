const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    throw new Error('Failed to fetch health status')
  }
  return response.json()
}
