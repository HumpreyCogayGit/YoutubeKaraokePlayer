const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Party {
  id: number;
  host_user_id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  host_name?: string;
  member_count?: number;
  pending_songs?: number;
}

export interface PartySong {
  id: number;
  party_id: number;
  video_id: string;
  title: string;
  thumbnail: string;
  channel_title: string;
  added_by_user_id: number;
  added_by_name: string;
  added_at: string;
  played: boolean;
  played_at?: string;
}

export interface PartyMember {
  id: number;
  name: string;
  profile_picture: string;
  joined_at: string;
}

export const partyAPI = {
  // Create a new party
  createParty: async (name: string, password: string): Promise<Party> => {
    const response = await fetch(`${API_URL}/api/party/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, password }),
    });
    if (!response.ok) throw new Error('Failed to create party');
    return response.json();
  },

  // Join a party
  joinParty: async (code: string, password: string, guest_name?: string): Promise<Party> => {
    const response = await fetch(`${API_URL}/api/party/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, password, guest_name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join party');
    }
    return response.json();
  },

  // Get user's active parties
  getMyParties: async (): Promise<Party[]> => {
    const response = await fetch(`${API_URL}/api/party/my-parties`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get parties');
    return response.json();
  },

  // Get party details
  getParty: async (partyId: number): Promise<Party> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get party');
    return response.json();
  },

  // Get party songs
  getPartySongs: async (partyId: number): Promise<PartySong[]> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}/songs`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get party songs');
    return response.json();
  },

  // Add song to party
  addSongToParty: async (partyId: number, song: {
    video_id: string;
    title: string;
    thumbnail: string;
    channel_title: string;
    guest_name?: string;
  }): Promise<PartySong> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(song),
    });
    if (!response.ok) throw new Error('Failed to add song');
    return response.json();
  },

  // Mark song as played
  markSongPlayed: async (partyId: number, songId: number): Promise<void> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}/songs/${songId}/played`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to mark song as played');
  },

  // Reorder song in queue
  reorderSong: async (partyId: number, songId: number, direction: 'up' | 'down'): Promise<void> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}/songs/${songId}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ direction }),
    });
    if (!response.ok) throw new Error('Failed to reorder song');
  },

  // Delete song from party
  deleteSong: async (partyId: number, songId: number, guestName?: string): Promise<void> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}/songs/${songId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ guest_name: guestName }),
    });
    if (!response.ok) throw new Error('Failed to delete song');
  },

  // End party
  endParty: async (partyId: number): Promise<void> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}/end`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to end party');
  },

  // Get party members
  getPartyMembers: async (partyId: number): Promise<PartyMember[]> => {
    const response = await fetch(`${API_URL}/api/party/${partyId}/members`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get party members');
    return response.json();
  },
};
