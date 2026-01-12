import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { userAPI } from '../api/api'

interface UserProfileProps {
  onClose: () => void
}

const UserProfile = ({ onClose }: UserProfileProps) => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ totalPlaylists: 0, totalSongs: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await userAPI.getStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">User Profile</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center mb-6">
            <img
              src={user?.profile_picture}
              alt={user?.name}
              className="w-24 h-24 rounded-full mb-4"
            />
            <h3 className="text-xl font-semibold text-white mb-1">{user?.name}</h3>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-500">
                {loading ? '...' : stats.totalPlaylists}
              </div>
              <div className="text-gray-300 text-sm mt-1">Playlists</div>
            </div>
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">
                {loading ? '...' : stats.totalSongs}
              </div>
              <div className="text-gray-300 text-sm mt-1">Songs Saved</div>
            </div>
          </div>

          <div className="text-gray-400 text-xs text-center">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
