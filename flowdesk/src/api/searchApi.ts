/**
 * REST calls for global search across notes and tasks.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export interface SearchResult {
  type: 'note' | 'task'
  id: number
  title: string
  snippet: string
  context: string | null
}

export const searchApi = {
  search: async (query: string): Promise<SearchResult[]> => {
    const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) {
      throw new Error(`Search failed with ${res.status}`)
    }
    return res.json() as Promise<SearchResult[]>
  },
}
