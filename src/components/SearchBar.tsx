import { useState, FormEvent, useRef } from 'react'
import { PlaylistItem } from '../App'

interface SearchResult {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  viewCount: number
  likeCount: number
}

type SortOption = 'relevance' | 'views' | 'likes'

interface SearchBarProps {
  onVideoSelect: (videoId: string) => void
  onAddToPlaylist: (item: PlaylistItem) => void
}

const SearchBar = ({ onVideoSelect, onAddToPlaylist }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [enableBlockedFilter, setEnableBlockedFilter] = useState(true)
  const [enablePreferredFilter, setEnablePreferredFilter] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastSearchTimeRef = useRef<number>(0)

  // Channels that commonly disable embedding
  const BLOCKED_CHANNELS = [
    'Sing King',
    'KaraFun',
    'KantaOke',
    'Vevo',
    'karaoke SESH'
    ]

  // Preferred channels to prioritize in search results
  const PREFERRED_CHANNELS = [
    'KB Arrangements Ph'
  ]

  // Security: Rate limiting - prevent API spam
  const RATE_LIMIT_MS = 1000 // 1 second between searches
  
  // Security: Input validation
  const sanitizeSearchQuery = (query: string): string => {
    // Remove potentially harmful characters
    const sanitized = query
      .trim()
      .slice(0, 200) // Limit length
      .replace(/[<>]/g, '') // Remove HTML-like characters
    
    return sanitized
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim()) return

    // Security: Rate limiting check
    const now = Date.now()
    if (now - lastSearchTimeRef.current < RATE_LIMIT_MS) {
      setError('Please wait before searching again')
      return
    }
    lastSearchTimeRef.current = now

    // Security: Sanitize input
    const sanitizedQuery = sanitizeSearchQuery(searchQuery)
    if (!sanitizedQuery) {
      setError('Invalid search query')
      return
    }

    setIsLoading(true)
    setError(null)
    
    // Use backend proxy to protect API key
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const searchUrl = `${API_URL}/api/youtube/search?q=${encodeURIComponent(sanitizedQuery)}`

    try {
      const searchResponse = await fetch(searchUrl, {
        credentials: 'include'
      })
      
      // Security: Check response status
      if (!searchResponse.ok) {
        throw new Error(`API error: ${searchResponse.status}`)
      }
      
      const searchData = await searchResponse.json()
      
      // Security: Validate API response structure
      if (!searchData.items || !Array.isArray(searchData.items)) {
        throw new Error('Invalid API response')
      }
      
      // Backend already fetches stats and sanitizes data
      const results: SearchResult[] = searchData.items
      
      setSearchResults(results)
    } catch (error) {
      // Security: Don't expose detailed error messages to users
      console.error('Error searching videos:', error)
      setError('Failed to search videos. Please try again.')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Sort results based on selected option
  const sortedResults = [...searchResults]
    .filter((result) => {
      // Filter out blocked channels (only if enabled)
      if (!enableBlockedFilter) return true
      return !BLOCKED_CHANNELS.some(blocked => 
        result.channelTitle.toLowerCase().includes(blocked.toLowerCase())
      )
    })
    .sort((a, b) => {
      // First priority: preferred channels always come first (only if enabled)
      if (enablePreferredFilter) {
        const aIsPreferred = PREFERRED_CHANNELS.some(pref => 
          a.channelTitle.toLowerCase().includes(pref.toLowerCase())
        )
        const bIsPreferred = PREFERRED_CHANNELS.some(pref => 
          b.channelTitle.toLowerCase().includes(pref.toLowerCase())
        )
        
        if (aIsPreferred && !bIsPreferred) return -1
        if (!aIsPreferred && bIsPreferred) return 1
      }
      
      // Then apply the selected sort option
      if (sortBy === 'views') {
        return b.viewCount - a.viewCount
      } else if (sortBy === 'likes') {
        return b.likeCount - a.likeCount
      }
      return 0 // Keep original order for 'relevance'
    })

  // Format number with K, M abbreviations
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K'
    }
    return count.toString()
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Search</h2>
      
      {/* Security: Error display */}
      {error && (
        <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for songs..."
            maxLength={200}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Search"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
          {searchResults.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchResults([])}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
              title="Clear search results"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Sort Options */}
      {searchResults.length > 0 && (
        <div className="mb-3 flex gap-2 items-center flex-wrap">
          <span className="text-gray-400 text-sm self-center">Sort by:</span>
          <button
            onClick={() => setSortBy('relevance')}
            className={`px-3 py-1 text-xs rounded-lg font-medium ${
              sortBy === 'relevance'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } transition-all`}
          >
            Relevance
          </button>
          <button
            onClick={() => setSortBy('views')}
            className={`px-3 py-1 text-xs rounded-lg font-medium ${
              sortBy === 'views'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } transition-all`}
          >
            Views
          </button>
          <button
            onClick={() => setSortBy('likes')}
            className={`px-3 py-1 text-xs rounded-lg font-medium ${
              sortBy === 'likes'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } transition-all`}
          >
            Likes
          </button>
          <div className="flex gap-2 ml-auto">
            <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBlockedFilter}
                onChange={(e) => setEnableBlockedFilter(e.target.checked)}
                className="w-3 h-3 rounded accent-orange-500"
              />
              Block
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePreferredFilter}
                onChange={(e) => setEnablePreferredFilter(e.target.checked)}
                className="w-3 h-3 rounded accent-orange-500"
              />
              Prefer
            </label>
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="overflow-y-auto space-y-2 max-h-[350px]">
        {sortedResults.map((result) => (
          <div
            key={result.id}
            className="bg-gray-700 border border-gray-600 rounded-lg p-2 hover:border-orange-500 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-16 h-10 object-cover rounded flex-shrink-0 cursor-pointer"
                onClick={() => onVideoSelect(result.id)}
              />
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-white font-medium text-xs line-clamp-1 mb-1 cursor-pointer hover:text-orange-400 transition-colors"
                  onClick={() => onVideoSelect(result.id)}
                >
                  {result.title}
                </h3>
                <p className="text-gray-400 text-xs line-clamp-1">{result.channelTitle}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    {formatCount(result.viewCount)}
                  </span>
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {formatCount(result.likeCount)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onVideoSelect(result.id)}
                  className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all"
                  title="Play"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>
                <button
                  onClick={() => onAddToPlaylist({
                    id: result.id,
                    title: result.title,
                    thumbnail: result.thumbnail,
                    channelTitle: result.channelTitle
                  })}
                  className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all"
                  title="Add to Playlist"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchBar
