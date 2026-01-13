import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Party, PartySong, partyAPI } from '../api/party'
import { usePartySSE } from '../hooks/usePartySSE'

interface PartyContextType {
  // State
  activeParty: Party | null
  songs: Map<number, PartySong>
  isHost: boolean
  isGuest: boolean
  guestName: string | null
  isLoading: boolean
  error: string | null
  
  // Computed
  unplayedSongs: PartySong[]
  currentSongIndex: number
  
  // Actions
  joinParty: (code: string, password: string, guestName?: string) => Promise<void>
  createParty: (name: string, password: string) => Promise<Party>
  addSong: (song: { video_id: string; title: string; thumbnail: string; channel_title: string }) => Promise<void>
  markSongPlayed: (songId: number) => Promise<PartySong | null>
  deleteSong: (songId: number) => Promise<void>
  reorderSong: (songId: number, direction: 'up' | 'down') => Promise<void>
  leaveParty: () => void
  endParty: () => Promise<void>
  refreshSongs: () => Promise<void>
  setCurrentSongIndex: (index: number) => void
  loadHostedParty: () => Promise<void>
}

const PartyContext = createContext<PartyContextType | undefined>(undefined)

export const useParty = () => {
  const context = useContext(PartyContext)
  if (!context) {
    throw new Error('useParty must be used within PartyProvider')
  }
  return context
}

interface PartyProviderProps {
  children: ReactNode
  userId?: number
  userName?: string
}

export const PartyProvider = ({ children, userId, userName }: PartyProviderProps) => {
  const [activeParty, setActiveParty] = useState<Party | null>(null)
  const [songs, setSongs] = useState<Map<number, PartySong>>(new Map())
  const [guestName, setGuestName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [useSSE, setUseSSE] = useState(true) // Try SSE first
  const [optimisticSongId, setOptimisticSongId] = useState(-1) // Negative IDs for optimistic updates

  // Load persisted guest party state on mount
  useEffect(() => {
    const savedGuestParty = localStorage.getItem('guestParty')
    const savedGuestName = localStorage.getItem('guestName')
    if (savedGuestParty && savedGuestName) {
      try {
        const party = JSON.parse(savedGuestParty)
        setActiveParty(party)
        setGuestName(savedGuestName)
        
        // Load songs for the restored party
        console.log('[PartyContext] Restoring guest party, loading songs:', party.id)
        partyAPI.getPartySongs(party.id)
          .then(fetchedSongs => {
            const songMap = new Map(fetchedSongs.map(song => [song.id, song]))
            setSongs(songMap)
          })
          .catch(err => {
            console.error('[PartyContext] Failed to load songs for restored guest party:', err)
          })
      } catch (err) {
        console.error('[PartyContext] Failed to restore guest party:', err)
        localStorage.removeItem('guestParty')
        localStorage.removeItem('guestName')
      }
    }
  }, [])

  // Auto-load hosted party when user is authenticated
  useEffect(() => {
    if (userId && !activeParty && !guestName) {
      console.log('[PartyContext] User authenticated, loading hosted party')
      loadHostedParty()
    }
  }, [userId])

  // Persist guest party state to localStorage
  useEffect(() => {
    if (activeParty && guestName) {
      localStorage.setItem('guestParty', JSON.stringify(activeParty))
      localStorage.setItem('guestName', guestName)
    } else {
      localStorage.removeItem('guestParty')
      localStorage.removeItem('guestName')
    }
  }, [activeParty, guestName])

  // Computed values
  const isHost = !!activeParty && activeParty.host_user_id === userId
  const isGuest = !!activeParty && !!guestName
  const unplayedSongs = Array.from(songs.values())
    .filter(song => !song.played)
    .sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())

  // Refresh songs from server
  const refreshSongs = useCallback(async () => {
    if (!activeParty) return

    try {
      const [fetchedSongs] = await Promise.all([
        partyAPI.getPartySongs(activeParty.id)
      ])
      const songMap = new Map(fetchedSongs.map(song => [song.id, song]))
      setSongs(songMap)
    } catch (err) {
      console.error('[PartyContext] Failed to refresh songs:', err)
      // If party not found, clear state
      if ((err as any).message?.includes('404') || (err as any).message?.includes('not found')) {
        setActiveParty(null)
        setSongs(new Map())
        setGuestName(null)
      }
    }
  }, [activeParty])

  // SSE event handlers
  const handleSongsReceived = useCallback((receivedSongs: PartySong[]) => {
    console.log('[PartyContext] handleSongsReceived called with', receivedSongs.length, 'songs')
    const songMap = new Map<number, PartySong>(receivedSongs.map(s => [s.id, s]))
    console.log('[PartyContext] Updated songs Map, new size:', songMap.size)
    setSongs(songMap)
  }, [])

  const handleSongAdded = useCallback((song: PartySong) => {
    console.log('[PartyContext] handleSongAdded called with:', song.title, 'ID:', song.id)
    setSongs(prev => {
      const newMap = new Map(prev)
      
      // Remove optimistic version if exists (same video_id but negative ID)
      for (const [id, existingSong] of prev.entries()) {
        if (id < 0 && existingSong.video_id === song.video_id) {
          console.log('[PartyContext] Removing optimistic song:', id)
          newMap.delete(id)
        }
      }
      
      // Add real song from server
      newMap.set(song.id, song)
      console.log('[PartyContext] Song added to Map, new size:', newMap.size)
      return newMap
    })
  }, [])

  const handleSongPlayed = useCallback((songId: number) => {
    setSongs(prev => {
      const newMap = new Map(prev)
      const song = newMap.get(songId)
      if (song) {
        newMap.set(songId, { ...song, played: true })
      }
      return newMap
    })
  }, [])

  const handleSSEError = useCallback((err: Error) => {
    console.error('[PartyContext] SSE error, falling back to polling:', err)
    setUseSSE(false)
  }, [])

  // Use SSE hook
  console.log('[PartyContext] usePartySSE setup - partyId:', activeParty?.id, 'enabled:', useSSE && !!activeParty)
  usePartySSE({
    partyId: activeParty?.id || null,
    enabled: useSSE && !!activeParty,
    onSongsReceived: handleSongsReceived,
    onSongAdded: handleSongAdded,
    onSongPlayed: handleSongPlayed,
    onError: handleSSEError
  })

  // Initial load and polling fallback
  useEffect(() => {
    if (!activeParty) return

    // Initial load
    refreshSongs()

    // Polling fallback if SSE disabled
    if (!useSSE) {
      console.log('[PartyContext] Using polling mode')
      const interval = setInterval(refreshSongs, 15000) // Poll every 15 seconds to avoid rate limiting

      // Handle page visibility changes
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refreshSongs()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [activeParty, useSSE, refreshSongs])

  // Join party
  const joinParty = useCallback(async (code: string, password: string, guestNameParam?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[PartyContext] Joining party:', code)
      const party = await partyAPI.joinParty(code, password, guestNameParam)
      setActiveParty(party)
      
      if (guestNameParam) {
        setGuestName(guestNameParam)
      }

      // Load initial songs
      const [fetchedSongs] = await Promise.all([
        partyAPI.getPartySongs(party.id)
      ])
      const songMap = new Map(fetchedSongs.map(song => [song.id, song]))
      setSongs(songMap)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to join party'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create party
  const createParty = useCallback(async (name: string, password: string): Promise<Party> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[PartyContext] Creating party:', name)
      const party = await partyAPI.createParty(name, password)
      setActiveParty(party)
      setSongs(new Map())
      return party
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create party'
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Add song to party
  const addSong = useCallback(async (song: { video_id: string; title: string; thumbnail: string; channel_title: string }) => {
    if (!activeParty) return

    // Optimistic update: Add song immediately with temporary ID
    const tempId = optimisticSongId
    setOptimisticSongId(prev => prev - 1) // Decrement for next optimistic song

    const optimisticSong: PartySong = {
      id: tempId,
      party_id: activeParty.id,
      video_id: song.video_id,
      title: song.title,
      thumbnail: song.thumbnail,
      channel_title: song.channel_title,
      added_by_user_id: userId ?? 0,
      added_by_name: guestName || userName || 'You',
      played: false,
      added_at: new Date().toISOString()
    }

    console.log('[PartyContext] Optimistic add:', song.title, 'tempId:', tempId)
    
    // Add optimistic song to Map
    setSongs(prev => {
      const newMap = new Map(prev)
      newMap.set(tempId, optimisticSong)
      return newMap
    })

    try {
      // Call server API
      await partyAPI.addSongToParty(activeParty.id, {
        video_id: song.video_id,
        title: song.title,
        thumbnail: song.thumbnail,
        channel_title: song.channel_title,
        guest_name: guestName || undefined
      })
      
      // Server will broadcast via SSE with real ID, which will replace optimistic version
      console.log('[PartyContext] Song added successfully via API')
    } catch (err: any) {
      // Rollback: Remove optimistic song on error
      console.error('[PartyContext] Failed to add song, rolling back:', err)
      setSongs(prev => {
        const newMap = new Map(prev)
        newMap.delete(tempId)
        return newMap
      })
      
      const errorMsg = err.message || 'Failed to add song'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [activeParty, guestName, optimisticSongId, userId])

  // Mark song as played
  const markSongPlayed = useCallback(async (songId: number): Promise<PartySong | null> => {
    if (!activeParty || !isHost) return null

    // Optimistic update: Mark as played immediately
    setSongs(prev => {
      const newMap = new Map(prev)
      const song = newMap.get(songId)
      if (song) {
        newMap.set(songId, { ...song, played: true, played_at: new Date().toISOString() })
      }
      return newMap
    })
    
    // Reset index to 0 since the next unplayed song will move to top
    setCurrentSongIndex(0)
    
    // Get the next song to play (after current is marked as played)
    const nextSong = Array.from(songs.values())
      .filter(s => !s.played && s.id !== songId)
      .sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())[0] || null

    try {
      console.log('[PartyContext] Marking song as played:', songId)
      await partyAPI.markSongPlayed(activeParty.id, songId)
      // Server will broadcast via SSE to confirm
      return nextSong
    } catch (err: any) {
      // Rollback: Mark as unplayed again
      console.error('[PartyContext] Failed to mark song as played, rolling back:', err)
      setSongs(prev => {
        const newMap = new Map(prev)
        const song = newMap.get(songId)
        if (song) {
          newMap.set(songId, { ...song, played: false, played_at: undefined })
        }
        return newMap
      })
      
      const errorMsg = err.message || 'Failed to mark song as played'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [activeParty, isHost, songs])

  // Reorder song (move up/down in queue)
  const reorderSong = useCallback(async (songId: number, direction: 'up' | 'down') => {
    if (!activeParty || !isHost) return

    try {
      await partyAPI.reorderSong(activeParty.id, songId, direction)
      // SSE will broadcast the updated song list
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to reorder song'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [activeParty, isHost])

  // Delete song from party
  const deleteSong = useCallback(async (songId: number) => {
    if (!activeParty) return

    try {
      await partyAPI.deleteSong(activeParty.id, songId, guestName || undefined)
      // SSE will broadcast the updated song list
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete song'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [activeParty, guestName])

  // Leave party
  const leaveParty = useCallback(() => {
    console.log('[PartyContext] Leaving party')
    setActiveParty(null)
    setSongs(new Map())
    setGuestName(null)
    setCurrentSongIndex(0)
    setError(null)
  }, [])

  // End party (host only)
  const endParty = useCallback(async () => {
    if (!activeParty || !isHost) return

    try {
      console.log('[PartyContext] Ending party')
      await partyAPI.endParty(activeParty.id)
      leaveParty()
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to end party'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [activeParty, isHost, leaveParty])

  // Load user's hosted party
  const loadHostedParty = useCallback(async () => {
    if (!userId) return

    try {
      console.log('[PartyContext] Loading hosted party for user:', userId)
      const parties = await partyAPI.getMyParties()
      const hostedParty = parties.find(p => p.host_user_id === userId && p.is_active)
      
      if (hostedParty) {
        console.log('[PartyContext] Found hosted party:', hostedParty.name)
        setActiveParty(hostedParty)
        const fetchedSongs = await partyAPI.getPartySongs(hostedParty.id)
        const songMap = new Map(fetchedSongs.map(song => [song.id, song]))
        setSongs(songMap)
      } else {
        console.log('[PartyContext] No active hosted party found')
      }
    } catch (err) {
      console.error('[PartyContext] Failed to load hosted party:', err)
    }
  }, [userId])

  const value: PartyContextType = {
    activeParty,
    songs,
    isHost,
    isGuest,
    guestName,
    isLoading,
    error,
    unplayedSongs,
    currentSongIndex,
    joinParty,
    createParty,
    addSong,
    markSongPlayed,
    deleteSong,
    reorderSong,
    leaveParty,
    endParty,
    refreshSongs,
    setCurrentSongIndex,
    loadHostedParty
  }

  return <PartyContext.Provider value={value}>{children}</PartyContext.Provider>
}
