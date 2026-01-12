import { useState } from 'react'
import SearchBar from './components/SearchBar'
import VideoPlayer from './components/VideoPlayer'
import Playlist from './components/Playlist'
import UserProfile from './components/UserProfile'
import SavedPlaylists from './components/SavedPlaylists'
import { useAuth } from './contexts/AuthContext'

export interface PlaylistItem {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
}

function App() {
  const { user, isAuthenticated, login, logout } = useAuth()
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSavedPlaylists, setShowSavedPlaylists] = useState(false)

  const addToPlaylist = (item: PlaylistItem) => {
    setPlaylist(prev => [...prev, item])
  }

  const removeFromPlaylist = (index: number) => {
    setPlaylist(prev => prev.filter((_, i) => i !== index))
    // Adjust current index if needed
    if (currentIndex > index) {
      setCurrentIndex(prev => prev - 1)
    } else if (currentIndex === index) {
      setCurrentIndex(-1)
    }
  }

  const playFromPlaylist = (index: number) => {
    setCurrentIndex(index)
    setSelectedVideoId(playlist[index].id)
  }

  const playNext = () => {
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setSelectedVideoId(playlist[nextIndex].id)
    }
  }

  const clearPlaylist = () => {
    setPlaylist([])
    setCurrentIndex(-1)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Youtube Karaoke Player by MangHumps
          </h1>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 transition-colors"
                >
                  <img
                    src={user?.profile_picture}
                    alt={user?.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-white font-medium">{user?.name}</span>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 z-50">
                    <button
                      onClick={() => {
                        setShowProfile(true)
                        setShowUserMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowSavedPlaylists(true)
                        setShowUserMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
                    >
                      My Playlists
                    </button>
                    <button
                      onClick={() => {
                        logout()
                        setShowUserMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-orange-400 hover:bg-gray-700 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full px-6 py-2 transition-all hover:scale-105 shadow-lg border-2 border-orange-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="h-[calc(100vh-73px)] px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Left Sidebar - Search & Playlist */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 h-full overflow-y-auto">
            <div className="flex-shrink-0">
              <SearchBar 
                onVideoSelect={setSelectedVideoId}
                onAddToPlaylist={addToPlaylist}
              />
            </div>
            <div className="flex-shrink-0">
              <Playlist 
                items={playlist}
                currentIndex={currentIndex}
                onPlay={playFromPlaylist}
                onRemove={removeFromPlaylist}
                onClear={clearPlaylist}
              />
            </div>
          </div>

          {/* Right Main Content - Video Player */}
          <div className="lg:col-span-8 xl:col-span-9 h-full overflow-hidden">
            <VideoPlayer 
              videoId={selectedVideoId}
              onVideoEnd={playNext}
            />
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
      
      {showSavedPlaylists && (
        <SavedPlaylists 
          onClose={() => setShowSavedPlaylists(false)}
          onLoadPlaylist={(items) => {
            setPlaylist(items)
            setCurrentIndex(-1)
            setShowSavedPlaylists(false)
          }}
        />
      )}
    </div>
  )
}

export default App
