const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface SavedPlaylist {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  items?: PlaylistItemData[];
}

export interface PlaylistItemData {
  id: string; // This is video_id from YouTube
  video_id?: string; // Database field name
  title: string;
  thumbnail: string;
  channelTitle: string;
}

export const playlistAPI = {
  // Get all playlists
  getPlaylists: async (): Promise<SavedPlaylist[]> => {
    const response = await fetch(`${API_URL}/api/playlists`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch playlists');
    return response.json();
  },

  // Get specific playlist
  getPlaylist: async (id: number): Promise<SavedPlaylist> => {
    const response = await fetch(`${API_URL}/api/playlists/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch playlist');
    return response.json();
  },

  // Create playlist
  createPlaylist: async (name: string, items: PlaylistItemData[]): Promise<SavedPlaylist> => {
    const response = await fetch(`${API_URL}/api/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, items }),
    });
    if (!response.ok) throw new Error('Failed to create playlist');
    return response.json();
  },

  // Update playlist
  updatePlaylist: async (id: number, name?: string, items?: PlaylistItemData[]): Promise<void> => {
    const response = await fetch(`${API_URL}/api/playlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, items }),
    });
    if (!response.ok) throw new Error('Failed to update playlist');
  },

  // Delete playlist
  deletePlaylist: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/api/playlists/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete playlist');
  },
};

export const userAPI = {
  // Get user stats
  getStats: async () => {
    const response = await fetch(`${API_URL}/api/user/stats`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
};
