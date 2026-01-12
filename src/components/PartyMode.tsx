import { useState, useEffect } from 'react';
import { partyAPI, Party, PartySong, PartyMember } from '../api/party';
import { PlaylistItem } from '../App';
import SearchBar from './SearchBar';
import { useAuth } from '../contexts/AuthContext';

interface PartyModeProps {
  onClose: (party?: Party | null, songs?: PartySong[], guestName?: string | null) => void;
  onVideoSelect: (videoId: string) => void;
  initialParty?: Party | null;
  onPartySongsUpdate?: (songs: PartySong[]) => void;
}

const PartyMode = ({ onClose, onVideoSelect, initialParty, onPartySongsUpdate }: PartyModeProps) => {
  const { user, isAuthenticated } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'join' | 'party'>(
    initialParty ? 'party' : (!isAuthenticated ? 'join' : 'list')
  );
  const [parties, setParties] = useState<Party[]>([]);
  const [currentParty, setCurrentParty] = useState<Party | null>(initialParty || null);
  const [partySongs, setPartySongs] = useState<PartySong[]>([]);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [partyEnded, setPartyEnded] = useState(false);
  
  // Create party form
  const [partyName, setPartyName] = useState('');
  const [partyPassword, setPartyPassword] = useState('');
  
  // Join party form
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  
  // QR code URL
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // Guest session (stored in state after joining)
  const [currentGuestName, setCurrentGuestName] = useState<string | null>(null);

  useEffect(() => {
    loadParties();
    
    // Check for party code in URL parameters (from QR code scan)
    const urlParams = new URLSearchParams(window.location.search);
    const partyCodeFromUrl = urlParams.get('party');
    if (partyCodeFromUrl) {
      setJoinCode(partyCodeFromUrl);
      setView('join');
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (currentParty && view === 'party') {
      loadPartyDetails();
      const interval = setInterval(loadPartyDetails, 5000); // Refresh every 5 seconds
      
      // Handle page visibility changes (important for mobile Safari)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('[PartyMode] Page became visible, refreshing party details')
          loadPartyDetails()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [currentParty, currentGuestName, view]); // Include currentGuestName to avoid stale closures

  useEffect(() => {
    if (currentParty && view === 'party') {
      generateQRCode();
    }
  }, [currentParty, view]);

  const loadParties = async () => {
    try {
      const data = await partyAPI.getMyParties();
      setParties(data);
    } catch (err) {
      console.error('Failed to load parties:', err);
    }
  };

  // Check if user has a hosted party
  const hasHostedParty = parties.some(p => p.host_user_id === user?.id);

  const loadPartyDetails = async () => {
    if (!currentParty) return;
    
    console.log('[PartyMode] Loading party details for party:', currentParty.id);
    
    try {
      // Only check party status if user is authenticated (host or member)
      // Guests don't have access to getParty endpoint
      if (isAuthenticated) {
        const partyDetails = await partyAPI.getParty(currentParty.id);
        
        if (!partyDetails.is_active) {
          // Party has ended - show message and close after 3 seconds
          setPartyEnded(true);
          setTimeout(() => {
            setCurrentParty(null);
            setView('list');
            onClose();
          }, 3000);
          return;
        }
      }
      
      const [songs, members] = await Promise.all([
        partyAPI.getPartySongs(currentParty.id),
        partyAPI.getPartyMembers(currentParty.id)
      ]);
      console.log('[PartyMode] Loaded', songs.length, 'songs');
      // Force a new array reference to trigger React re-render
      setPartySongs([...songs]);
      setPartyMembers(members);
      // Notify parent component of song updates (for guests viewing on main screen)
      if (onPartySongsUpdate) {
        console.log('[PartyMode] Calling onPartySongsUpdate with', songs.length, 'songs');
        onPartySongsUpdate(songs);
      } else {
        console.log('[PartyMode] onPartySongsUpdate callback not provided');
      }
    } catch (err) {
      console.error('Failed to load party details:', err);
      // If party not found (404), it might have been ended
      if ((err as any).message?.includes('404') || (err as any).message?.includes('not found')) {
        setPartyEnded(true);
        setTimeout(() => {
          setCurrentParty(null);
          setView('list');
          onClose();
        }, 3000);
      }
    }
  };

  const generateQRCode = async () => {
    if (!currentParty) return;
    
    // Simple data URL encoding for QR code (you can enhance this)
    const joinUrl = `${window.location.origin}?party=${currentParty.code}`;
    const qrData = encodeURIComponent(joinUrl);
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`);
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const party = await partyAPI.createParty(partyName, partyPassword);
      setCurrentParty(party);
      setView('party');
      loadParties();
      // Close the modal after successful creation
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const party = await partyAPI.joinParty(joinCode, joinPassword, guestName || undefined);
      setCurrentParty(party);
      if (guestName) {
        setCurrentGuestName(guestName);
      }
      setView('party');
      loadParties();
      // Load party details immediately for guests using the party object directly
      const [songs, members] = await Promise.all([
        partyAPI.getPartySongs(party.id),
        partyAPI.getPartyMembers(party.id)
      ]);
      // Force a new array reference to trigger React re-render
      setPartySongs([...songs]);
      setPartyMembers(members);
      // Notify parent component of initial song load
      if (onPartySongsUpdate) {
        onPartySongsUpdate(songs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join party');
    } finally {
      setLoading(false);
    }
  };

  const handleEndParty = async () => {
    if (!currentParty || !confirm('Are you sure you want to end this party?')) return;

    try {
      await partyAPI.endParty(currentParty.id);
      setCurrentParty(null);
      setView('list');
      loadParties();
    } catch (err: any) {
      setError(err.message || 'Failed to end party');
    }
  };

  const handleClose = () => {
    // If user is a guest in a party, pass the party data back to App
    if (currentParty && currentGuestName) {
      onClose(currentParty, partySongs, currentGuestName);
    } else {
      onClose();
    }
  };

  const handleLeaveParty = () => {
    if (!confirm('Are you sure you want to leave this party?')) return;
    setCurrentParty(null);
    setCurrentGuestName(null);
    setView('list');
    onClose(); // Call onClose without party data to clear guest state
  };

  const handleMarkPlayed = async (songId: number) => {
    if (!currentParty) return;

    try {
      await partyAPI.markSongPlayed(currentParty.id, songId);
      loadPartyDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to mark song as played');
    }
  };

  const handlePlaySong = (videoId: string) => {
    onVideoSelect(videoId);
  };

  const handleAddSongToParty = async (item: PlaylistItem) => {
    if (!currentParty) return;

    try {
      console.log('[PartyMode] Adding song to party:', item.title);
      await partyAPI.addSongToParty(currentParty.id, {
        video_id: item.id,
        title: item.title,
        thumbnail: item.thumbnail,
        channel_title: item.channelTitle,
        guest_name: currentGuestName || undefined,
      });
      console.log('[PartyMode] Song added successfully, reloading party details');
      // Reload party details to update the queue
      await loadPartyDetails();
      console.log('[PartyMode] Party details reloaded');
      setShowSearch(false);
    } catch (err: any) {
      console.error('[PartyMode] Failed to add song:', err);
      setError(err.message || 'Failed to add song');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-white">Party Mode</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setView('create')}
                disabled={hasHostedParty}
                className="bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Party
              </button>
              <button
                onClick={() => setView('join')}
                className="bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-semibold"
              >
                Join Party
              </button>
            </div>
            {hasHostedParty && (
              <div className="mb-4 p-3 bg-yellow-900 border border-yellow-700 rounded text-yellow-200 text-sm">
                You already have an active party. End it before creating a new one.
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-4">Your Active Parties</h3>
            {parties.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active parties</p>
            ) : (
              <div className="space-y-3">
                {parties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => { setCurrentParty(party); setView('party'); }}
                    className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-lg">{party.name}</div>
                        <div className="text-gray-400 text-sm">
                          Code: <span className="font-mono bg-gray-900 px-2 py-1 rounded">{party.code}</span>
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Host: {party.host_name} • {party.member_count} members • {party.pending_songs} songs
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Party View */}
        {view === 'create' && (
          <div className="p-6">
            <button
              onClick={() => setView('list')}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← Back
            </button>
            <h3 className="text-xl font-bold text-white mb-4">Create New Party</h3>
            <form onSubmit={handleCreateParty} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Party Name</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                  placeholder="e.g., Friday Night Karaoke"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={partyPassword}
                  onChange={(e) => setPartyPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                  placeholder="Create a password for your party"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Party'}
              </button>
            </form>
          </div>
        )}

        {/* Join Party View */}
        {view === 'join' && (
          <div className="p-6">
            <button
              onClick={() => setView('list')}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← Back
            </button>
            <h3 className="text-xl font-bold text-white mb-4">Join a Party</h3>
            <form onSubmit={handleJoinParty} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                  placeholder="Enter your name"
                  required
                />
                <p className="text-gray-500 text-xs mt-1">This will be shown next to songs you add</p>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Party Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none font-mono text-lg"
                  placeholder="XXXXXX"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                  placeholder="Enter party password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Party'}
              </button>
            </form>
          </div>
        )}

        {/* Party View */}
        {view === 'party' && currentParty && (
          <div className="p-6">
            {/* Party Ended Overlay */}
            {partyEnded && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 border-2 border-red-500 rounded-lg p-8 text-center">
                  <h2 className="text-4xl font-bold text-red-500 mb-4">Party Ended</h2>
                  <p className="text-gray-300">Redirecting to home page...</p>
                </div>
              </div>
            )}
            
            <button
              onClick={() => { setCurrentParty(null); setView('list'); }}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← Back
            </button>
            
            {/* Party Info */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-white">{currentParty.name}</h3>
                    {currentParty.host_user_id === user?.id ? (
                      <span className="bg-yellow-600 text-yellow-100 text-xs font-bold px-2 py-1 rounded-full">
                        HOST WINDOW
                      </span>
                    ) : (
                      <span className="bg-blue-600 text-blue-100 text-xs font-bold px-2 py-1 rounded-full">
                        GUEST
                      </span>
                    )}
                  </div>
                  <div className="text-gray-300 mb-2">
                    Party Code: <span className="font-mono bg-gray-900 px-3 py-1 rounded text-lg">{currentParty.code}</span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {partySongs.filter(s => !s.played).length} song{partySongs.filter(s => !s.played).length !== 1 ? 's' : ''} in queue
                  </div>
                </div>
                {/* Only show QR code and members to host */}
                {currentParty.host_user_id === user?.id && qrCodeUrl && (
                  <div className="ml-4">
                    <img src={qrCodeUrl} alt="Party QR Code" className="w-32 h-32 bg-white p-2 rounded" />
                    <div className="text-xs text-gray-400 text-center mt-1">Scan to join</div>
                  </div>
                )}
              </div>
            </div>

            {/* Members - Host only */}
            {currentParty.host_user_id === user?.id && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-3">Members ({partyMembers.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {partyMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 bg-gray-700 rounded-full px-3 py-1">
                      <img src={member.profile_picture} alt={member.name} className="w-6 h-6 rounded-full" />
                      <span className="text-white text-sm">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Song Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-lg font-semibold"
              >
                {showSearch ? 'Hide Search' : 'Add Song to Queue'}
              </button>
            </div>

            {/* Search Bar (when adding songs) */}
            {showSearch && (
              <div className="mb-6 bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-bold text-white mb-3">Search for Songs</h4>
                <SearchBar
                  onVideoSelect={(videoId) => {
                    handlePlaySong(videoId);
                    setShowSearch(false);
                  }}
                  onAddToPlaylist={handleAddSongToParty}
                />
              </div>
            )}

            {/* Songs Queue */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-bold text-white">Song Queue</h4>
                <button
                  onClick={() => {
                    console.log('[PartyMode] Manual refresh triggered')
                    loadPartyDetails()
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              {partySongs.filter(song => !song.played).length === 0 ? (
                <p className="text-gray-400 text-center py-8">No songs added yet. Click "Add Song to Queue" to search!</p>
              ) : (
                <div className="space-y-2">
                  {partySongs.filter(song => !song.played).map((song) => (
                    <div
                      key={song.id}
                      className="p-3 rounded-lg flex items-center gap-3 bg-gray-700"
                    >
                      <img src={song.thumbnail} alt={song.title} className="w-20 h-14 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{song.title}</div>
                        <div className="text-gray-400 text-sm truncate">{song.channel_title}</div>
                        <div className="text-gray-500 text-xs">Added by {song.added_by_name}</div>
                      </div>
                      {/* Only show Play/Done buttons to host */}
                      {currentParty.host_user_id === user?.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePlaySong(song.video_id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Play
                          </button>
                          <button
                            onClick={() => handleMarkPlayed(song.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* End Party Button (Host only) */}
            {currentParty.host_user_id === user?.id && (
              <button
                onClick={handleEndParty}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-semibold"
              >
                End Party
              </button>
            )}
            
            {/* Leave Party Button (Guest only) */}
            {currentParty.host_user_id !== user?.id && (
              <button
                onClick={handleLeaveParty}
                className="w-full mt-6 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded font-semibold"
              >
                Leave Party
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyMode;
