import { useState, useEffect, useCallback } from 'react'
import { PartySong } from '../api/party'

interface UsePartySSEOptions {
  partyId: number | null
  enabled: boolean
  onSongsReceived: (songs: PartySong[]) => void
  onSongAdded: (song: PartySong) => void
  onSongPlayed: (songId: number) => void
  onError?: (error: Error) => void
}

interface UsePartySSEReturn {
  isConnected: boolean
  error: Error | null
  retry: () => void
}

export const usePartySSE = ({
  partyId,
  enabled,
  onSongsReceived,
  onSongAdded,
  onSongPlayed,
  onError
}: UsePartySSEOptions): UsePartySSEReturn => {
  console.log('[usePartySSE] Hook called - partyId:', partyId, 'enabled:', enabled)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const cleanup = useCallback(() => {
    if (eventSource) {
      console.log('[usePartySSE] Closing EventSource')
      eventSource.close()
      setEventSource(null)
      setIsConnected(false)
    }
  }, [eventSource])

  const connect = useCallback(() => {
    if (!partyId || !enabled) return
    
    // Prevent duplicate connections
    if (eventSource) {
      console.log('[usePartySSE] EventSource already exists, skipping creation')
      return
    }

    console.log('[usePartySSE] Connecting to party:', partyId)
    const es = new EventSource(`/api/party/${partyId}/stream`)
    
    es.onopen = () => {
      console.log('[usePartySSE] Connected to party:', partyId)
      setIsConnected(true)
      setError(null)
    }

    es.onmessage = (e: MessageEvent) => {
      console.log('[usePartySSE] Message received:', e.data)
      try {
        const data = JSON.parse(e.data)
        console.log('[usePartySSE] Parsed data:', data)

        switch (data.type) {
          case 'connected':
            console.log('[usePartySSE] Handshake complete')
            if (data.songs) {
              onSongsReceived(data.songs)
            }
            break

          case 'songs':
            console.log('[usePartySSE] Received initial songs:', data.songs?.length)
            if (data.songs) {
              onSongsReceived(data.songs)
            }
            break

          case 'song_added':
            console.log('[usePartySSE] Song added event:', data.song?.title)
            if (data.song) {
              console.log('[usePartySSE] Calling onSongAdded with:', data.song)
              onSongAdded(data.song)
            }
            break

          case 'song_played':
            console.log('[usePartySSE] Song played event')
            if (data.songId) {
              onSongPlayed(data.songId)
            }
            break

          default:
            console.log('[usePartySSE] Unknown message type:', data.type)
        }
      } catch (err) {
        console.error('[usePartySSE] Failed to parse message:', err)
        const parseError = err instanceof Error ? err : new Error('Failed to parse SSE message')
        setError(parseError)
        if (onError) onError(parseError)
      }
    }

    es.onerror = (err) => {
      console.error('[usePartySSE] Connection error:', err)
      const connectionError = new Error('SSE connection failed')
      setError(connectionError)
      setIsConnected(false)
      es.close()
      setEventSource(null)
      if (onError) onError(connectionError)
    }

    setEventSource(es)
  }, [partyId, enabled, eventSource, onSongsReceived, onSongAdded, onSongPlayed, onError])

  const retry = useCallback(() => {
    cleanup()
    setError(null)
    setTimeout(() => connect(), 1000)
  }, [cleanup, connect])

  useEffect(() => {
    if (!partyId || !enabled) {
      cleanup()
      return
    }

    connect()

    return () => {
      cleanup()
    }
  }, [partyId, enabled]) // Don't include connect/cleanup in deps to avoid infinite loop

  return {
    isConnected,
    error,
    retry
  }
}
