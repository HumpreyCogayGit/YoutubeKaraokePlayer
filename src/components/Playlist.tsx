import { useState } from 'react'
import { PlaylistItem } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { playlistAPI } from '../api/api'

interface PlaylistProps {
  items: PlaylistItem[]
  currentIndex: number
  onPlay: (index: number) => void
  onRemove: (index: number) => void
  onClear: () => void
  isPartyPlaylist?: boolean
  partyName?: string
  isHost?: boolean
  guestName?: string | null
  onReorder?: (index: number, direction: 'up' | 'down') => void
}

const Playlist = ({ items, currentIndex, onPlay, onRemove, onClear, isPartyPlaylist = false, partyName, isHost = false, guestName, onReorder }: PlaylistProps) => {
  const { isAuthenticated } = useAuth()
  const [saving, setSaving] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const handleSavePlaylist = async () => {
    if (!playlistName.trim()) {
      alert('Please enter a playlist name')
      return
    }

    setSaving(true)
    try {
      await playlistAPI.createPlaylist(playlistName, items)
      alert('Playlist saved successfully!')
      setShowSaveDialog(false)
      setPlaylistName('')
    } catch (error) {
      console.error('Failed to save playlist:', error)
      alert('Failed to save playlist')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isPartyPlaylist ? 'Party Queue' : 'Playlist'} ({items.length})
          </h2>
          {isPartyPlaylist && partyName && (
            <p className="text-xs text-emerald-400 mt-1">
              <span className="bg-emerald-600 px-2 py-0.5 rounded">PARTY</span> {partyName}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!isPartyPlaylist && isAuthenticated && items.length > 0 && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-all"
            >
              Save
            </button>
          )}
          {!isPartyPlaylist && items.length > 0 && (
            <button
              onClick={onClear}
              className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-all"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {showSaveDialog && (
        <div className="mb-3 p-3 bg-gray-700 border border-gray-600 rounded-lg">
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Enter playlist name..."
            className="w-full px-3 py-2 bg-gray-600 text-white rounded mb-2 text-sm border border-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSavePlaylist}
              disabled={saving}
              className="flex-1 px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Confirm'}
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false)
                setPlaylistName('')
              }}
              className="flex-1 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-4">
            No songs in playlist. Add songs from search results!
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className={`bg-gray-700 border rounded-lg p-2 flex items-center gap-2 transition-all ${
                currentIndex === index ? 'border-orange-500 shadow-md' : 'border-gray-600 hover:border-orange-500/50'
              }`}
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-16 h-10 object-cover rounded flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-xs font-medium line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-xs line-clamp-1">{item.channelTitle}</p>
                {isPartyPlaylist && item.addedBy && (
                  <p className="text-emerald-400 text-xs mt-0.5">
                    Added by: {item.addedBy}
                  </p>
                )}
              </div>
              {/* Show action buttons: always for non-party, for hosts in party, or for guests' own songs */}
              {(!isPartyPlaylist || isHost || (guestName && item.addedBy === guestName)) && (
                <div className="flex gap-1 flex-shrink-0">
                  {/* Reorder buttons - only for party hosts (not guests) */}
                  {isPartyPlaylist && isHost && onReorder && !guestName && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => onReorder(index, 'up')}
                        disabled={index === 0 || index === currentIndex || index === currentIndex + 1}
                        className={`p-0.5 rounded transition-all ${
                          index === 0 || index === currentIndex || index === currentIndex + 1
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        title={index === currentIndex ? "Cannot move currently playing song" : index === currentIndex + 1 ? "Cannot move next song up" : "Move up"}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onReorder(index, 'down')}
                        disabled={index === items.length - 1 || index === currentIndex}
                        className={`p-0.5 rounded transition-all ${
                          index === items.length - 1 || index === currentIndex
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        title={index === currentIndex ? "Cannot move currently playing song" : "Move down"}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {/* Play button - only for hosts or non-party playlists */}
                  {(!isPartyPlaylist || (isHost && !guestName)) && (
                    <button
                      onClick={() => onPlay(index)}
                      className="p-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all"
                      title="Play"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                  )}
                  {/* Remove/Delete button - hide for currently playing song in party playlists, show for guests' own songs */}
                  {!(isPartyPlaylist && index === currentIndex) && (
                    <button
                      onClick={() => onRemove(index)}
                      className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all"
                      title={isPartyPlaylist ? "Delete song" : "Remove"}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Playlist
