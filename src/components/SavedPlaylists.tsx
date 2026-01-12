import { useEffect, useState } from 'react'
import { playlistAPI, SavedPlaylist } from '../api/api'
import { PlaylistItem } from '../App'

interface SavedPlaylistsProps {
  onClose: () => void
  onLoadPlaylist: (items: PlaylistItem[]) => void
}

const SavedPlaylists = ({ onClose, onLoadPlaylist }: SavedPlaylistsProps) => {
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      const data = await playlistAPI.getPlaylists()
      setPlaylists(data)
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadPlaylist = async (playlist: SavedPlaylist) => {
    try {
      const fullPlaylist = await playlistAPI.getPlaylist(playlist.id)
      const items: PlaylistItem[] = fullPlaylist.items?.map(item => ({
        id: item.video_id || item.id, // Use video_id from database, fallback to id
        title: item.title,
        thumbnail: item.thumbnail,
        channelTitle: item.channelTitle,
      })) || []
      onLoadPlaylist(items)
    } catch (error) {
      console.error('Failed to load playlist:', error)
    }
  }

  const handleDeletePlaylist = async (id: number) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return
    
    try {
      await playlistAPI.deletePlaylist(id)
      setPlaylists(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete playlist:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">My Saved Playlists</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : playlists.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No saved playlists yet. Save your current playlist to see it here!
            </div>
          ) : (
            <div className="space-y-3">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-orange-500 transition-all hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-lg mb-1">
                        {playlist.name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Updated {new Date(playlist.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadPlaylist(playlist)}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-all text-sm font-medium"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-all text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SavedPlaylists
