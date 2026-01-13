import { useState, useEffect } from 'react'
import SearchBar from './components/SearchBar'
import VideoPlayer from './components/VideoPlayer'
import Playlist from './components/Playlist'
import UserProfile from './components/UserProfile'
import SavedPlaylists from './components/SavedPlaylists'
import PartyMode from './components/PartyMode'
import HostPartyList from './components/HostPartyList'
import YouTubeEngagement from './components/YouTubeEngagement'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAuth } from './contexts/AuthContext'
import { useParty } from './contexts/PartyContext'

export interface PlaylistItem {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  addedBy?: string
}

function App() {
  const { user, isAuthenticated, login, logout } = useAuth()
  const { activeParty, unplayedSongs, isHost, isGuest, guestName, currentSongIndex, setCurrentSongIndex, markSongPlayed, addSong, refreshSongs, reorderSong, deleteSong } = useParty()
  
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [selectedParty, setSelectedParty] = useState<any>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSavedPlaylists, setShowSavedPlaylists] = useState(false)
  const [showPartyMode, setShowPartyMode] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // Check for QR code scan on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const partyCodeFromUrl = urlParams.get('party')
    if (partyCodeFromUrl) {
      // Automatically open Party Mode when QR code is scanned
      setShowPartyMode(true)
    }
  }, [])

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

  const playNext = async () => {
    const isPartyPlaylist = !!activeParty
    
    // Mark current song as played for party playlists
    if (isPartyPlaylist && isHost && currentSongIndex >= 0 && unplayedSongs[currentSongIndex]) {
      const currentSong = unplayedSongs[currentSongIndex]
      try {
        const nextSong = await markSongPlayed(currentSong.id)
        // markSongPlayed returns the next song to play
        if (nextSong) {
          setSelectedVideoId(nextSong.video_id)
        } else {
          setSelectedVideoId('')
        }
        return
      } catch (err) {
        console.error('Failed to mark song as played:', err)
      }
    }

    // For non-party playlists, just move to next index
    const currentIndex = isPartyPlaylist ? currentSongIndex : playlist.findIndex(p => p.id === selectedVideoId)
    const displayList = isPartyPlaylist ? partyPlaylist : playlist
    
    if (currentIndex < displayList.length - 1) {
      const nextIndex = currentIndex + 1
      if (isPartyPlaylist) {
        setCurrentSongIndex(nextIndex)
      }
      setSelectedVideoId(displayList[nextIndex].id)
    } else {
      // No more songs, reset
      if (isPartyPlaylist) {
        setCurrentSongIndex(0)
      }
      setSelectedVideoId('')
    }
  }

  const clearPlaylist = () => {
    setPlaylist([])
    setCurrentIndex(-1)
  }

  // Convert party songs to playlist items (exclude played songs)
  const partyPlaylist: PlaylistItem[] = unplayedSongs.map(song => ({
    id: song.video_id,
    title: song.title,
    thumbnail: song.thumbnail,
    channelTitle: song.channel_title,
    addedBy: song.added_by_name
  }))

  // Determine which playlist to show
  const displayPlaylist = activeParty ? partyPlaylist : playlist
  const isPartyPlaylist = !!activeParty

  const handlePlayFromPlaylist = (index: number) => {
    if (isPartyPlaylist) {
      setCurrentSongIndex(index)
      setSelectedVideoId(displayPlaylist[index].id)
    } else {
      setSelectedVideoId(playlist[index].id)
    }
  }

  const handleRemoveFromPlaylist = async (index: number) => {
    if (isPartyPlaylist) {
      // For party playlist, delete the song (guests can delete their own, hosts can delete any)
      const song = unplayedSongs[index]
      if (song) {
        try {
          await deleteSong(song.id)
        } catch (err) {
          console.error('Failed to delete song:', err)
        }
      }
    } else {
      removeFromPlaylist(index)
    }
  }

  const handleClearPlaylist = () => {
    if (!isPartyPlaylist) {
      clearPlaylist()
    }
  }

  const handleAddToPlaylist = async (item: PlaylistItem) => {
    if (activeParty) {
      // Add to party playlist using PartyContext
      try {
        await addSong({
          video_id: item.id,
          title: item.title,
          thumbnail: item.thumbnail,
          channel_title: item.channelTitle,
        })
      } catch (err) {
        console.error('Failed to add song to party:', err)
      }
    } else {
      // Add to regular playlist
      addToPlaylist(item)
    }
  }

  const handleSkipCurrentSong = async () => {
    if (!isPartyPlaylist || !isHost) return
    
    // Mark current song as played
    const currentSong = unplayedSongs[currentSongIndex]
    if (currentSong) {
      try {
        const nextSong = await markSongPlayed(currentSong.id)
        // markSongPlayed returns the next song and resets currentSongIndex to 0
        if (nextSong) {
          setSelectedVideoId(nextSong.video_id)
        } else {
          setSelectedVideoId('')
        }
      } catch (err) {
        console.error('Failed to skip song:', err)
      }
    }
  }

  const handleReorderSong = async (index: number, direction: 'up' | 'down') => {
    if (!isPartyPlaylist || !isHost) return
    
    const song = unplayedSongs[index]
    if (song) {
      try {
        await reorderSong(song.id, direction)
      } catch (err) {
        console.error('Failed to reorder song:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Youtube Karaoke Player by MangHumps
              <span className="ml-2 text-xs font-normal bg-yellow-600 text-yellow-100 px-2 py-1 rounded">BETA</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Build #{import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || import.meta.env.VITE_BUILD_ID || 'dev'}</p>
          </div>
          
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
                        setShowPartyMode(true)
                        setShowUserMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-[#10b981] hover:bg-gray-700 transition-colors"
                    >
                      Party Mode
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPartyMode(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full px-5 py-2 transition-all hover:scale-105 shadow-lg"
                >
                  Join Party
                </button>
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="h-[calc(100vh-73px)] px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Left Sidebar - Search & Playlist */}
          {showSidebar && (
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 h-full overflow-y-auto">
              <div className="flex-shrink-0">
                <SearchBar 
                  onVideoSelect={setSelectedVideoId}
                  onAddToPlaylist={handleAddToPlaylist}
                />
              </div>
              {isAuthenticated && (
                <div className="flex-shrink-0">
                  <HostPartyList 
                    onSelectParty={(party) => {
                      setSelectedParty(party);
                      setShowPartyMode(true);
                    }}
                  />
                </div>
              )}
              <div className="flex-shrink-0">
                {/* Manual refresh button for guests on mobile */}
                {isGuest && (
                  <button
                    onClick={() => {
                      console.log('[App] Manual refresh triggered')
                      refreshSongs()
                    }}
                    className="w-full mb-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Queue
                  </button>
                )}
                <Playlist 
                  items={displayPlaylist}
                  currentIndex={isPartyPlaylist ? currentSongIndex : currentIndex}
                  onPlay={handlePlayFromPlaylist}
                  onRemove={handleRemoveFromPlaylist}
                  onClear={handleClearPlaylist}
                  isPartyPlaylist={isPartyPlaylist}
                  partyName={activeParty?.name}
                  isHost={isHost}
                  guestName={guestName}
                  onReorder={isPartyPlaylist && isHost ? handleReorderSong : undefined}
                />
              </div>
            </div>
          )}

          {/* Right Main Content - Video Player */}
          <div className={`${showSidebar ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'} h-full overflow-hidden flex flex-col`}>
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="mb-2 self-start bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                {showSidebar ? (
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                )}
              </svg>
              {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
            </button>
            {isPartyPlaylist && isHost && currentSongIndex >= 0 && (
              <div className="bg-[#10b981] border border-emerald-400 rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded flex-shrink-0">CURRENT SONG</span>
                    <div className="overflow-hidden">
                      <div className="text-white text-sm truncate">
                        {unplayedSongs[currentSongIndex]?.title} • Added by: {unplayedSongs[currentSongIndex]?.added_by_name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSkipCurrentSong}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-2 flex-shrink-0 ml-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                    </svg>
                    Skip Song
                  </button>
                </div>
                {currentSongIndex < unplayedSongs.length - 1 && (
                  <div className="flex items-center gap-2 overflow-hidden border-t border-emerald-400 pt-2">
                    <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded flex-shrink-0">UP NEXT</span>
                    <div className="overflow-hidden">
                      <div className="text-white text-sm truncate">
                        {unplayedSongs[currentSongIndex + 1]?.title} • Added by: {unplayedSongs[currentSongIndex + 1]?.added_by_name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Video Player - Hidden for guests */}
            {!isGuest && (
              <VideoPlayer 
                videoId={selectedVideoId}
                onVideoEnd={playNext}
              />
            )}
            
            {/* Guest Message - Show when user is a guest */}
            {isGuest && (
              <div className="flex-1 bg-gray-800 rounded-lg flex items-center justify-center p-6">
                <div className="text-center max-w-lg">
                  <h2 className="text-2xl font-bold text-emerald-500 mb-2">Guest Mode</h2>
                  <p className="text-gray-400 mb-6">You're viewing the party as: <span className="text-white font-semibold">{guestName}</span></p>
                  
                  {(() => {
                    // Find the guest's next song in the queue
                    const guestSongs = unplayedSongs.filter(song => song.added_by_name === guestName)
                    const nextGuestSong = guestSongs[0]
                    
                    if (nextGuestSong) {
                      const position = unplayedSongs.findIndex(song => song.id === nextGuestSong.id) + 1
                      const songsUntil = position - 1
                      
                      return (
                        <div className="bg-emerald-900/30 border-2 border-emerald-500 rounded-lg p-6 mb-4">
                          <div className="text-emerald-400 text-sm font-semibold mb-2">YOUR NEXT SONG</div>
                          <div className="text-white text-xl font-bold mb-3 truncate">{nextGuestSong.title}</div>
                          <div className="flex items-center justify-center gap-4 text-center">
                            <div className="bg-emerald-600 px-6 py-3 rounded-lg">
                              <div className="text-3xl font-bold text-white">{position}</div>
                              <div className="text-emerald-200 text-xs mt-1">Position in Queue</div>
                            </div>
                            {songsUntil > 0 && (
                              <div className="bg-orange-600 px-6 py-3 rounded-lg">
                                <div className="text-3xl font-bold text-white">{songsUntil}</div>
                                <div className="text-orange-200 text-xs mt-1">Song{songsUntil !== 1 ? 's' : ''} Until Yours</div>
                              </div>
                            )}
                          </div>
                          {songsUntil === 0 && (
                            <div className="mt-4 text-emerald-300 font-semibold animate-pulse">
                              🎤 Your song is playing now!
                            </div>
                          )}
                        </div>
                      )
                    } else {
                      return (
                        <div className="bg-gray-700 border border-gray-600 rounded-lg p-6 mb-4">
                          <p className="text-gray-300">You haven't added any songs yet!</p>
                          <p className="text-gray-500 text-sm mt-2">Search and add songs to see your queue position</p>
                        </div>
                      )
                    }
                  })()}
                  
                  <p className="text-gray-500 text-sm">Only the host can play videos</p>
                  <button
                    onClick={() => setShowPartyMode(true)}
                    className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  >
                    Open Party Details
                  </button>
                  
                  {/* YouTube Engagement Prompt - Shows for guests when a song is playing */}
                  {currentSongIndex >= 0 && unplayedSongs[currentSongIndex] && (
                    <div className="mt-6">
                      <YouTubeEngagement 
                        videoId={unplayedSongs[currentSongIndex].video_id}
                        videoTitle={unplayedSongs[currentSongIndex].title}
                        showInterval={90000}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
      
      {showPartyMode && (
        <ErrorBoundary>
          <PartyMode 
            onClose={() => {
              setShowPartyMode(false);
              setSelectedParty(null);
            }}
            onVideoSelect={setSelectedVideoId}
            initialParty={selectedParty}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}

export default App
