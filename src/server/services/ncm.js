import { NCM_BASE_URL } from '../config.js'

export async function fetchNcm(path, params = {}) {
  const url = new URL(path, NCM_BASE_URL)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status}`)
  }

  return response.json()
}
