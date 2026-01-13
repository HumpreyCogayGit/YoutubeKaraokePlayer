import { useState, useEffect } from 'react'

interface YouTubeEngagementProps {
  videoId: string
  videoTitle?: string
  showInterval?: number // milliseconds between showing the prompt
}

export default function YouTubeEngagement({ 
  videoId,
  showInterval = 60000 // Show every 60 seconds by default
}: YouTubeEngagementProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Reset when video changes
    setIsDismissed(false)
    setIsVisible(false)

    // Show prompt after a short delay (5 seconds into the song)
    const initialTimeout = setTimeout(() => {
      if (!isDismissed) {
        setIsVisible(true)
      }
    }, 5000)

    // Set up interval to show periodically
    const interval = setInterval(() => {
      if (!isDismissed) {
        setIsVisible(true)
      }
    }, showInterval)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [videoId, isDismissed, showInterval])

  // Auto-hide after 10 seconds
  useEffect(() => {
    if (isVisible) {
      const timeout = setTimeout(() => {
        setIsVisible(false)
      }, 10000)

      return () => clearTimeout(timeout)
    }
  }, [isVisible])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
  }

  const handleLikeClick = () => {
    // Open YouTube video in new tab
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank', 'noopener,noreferrer')
    setIsVisible(false)
  }

  if (!isVisible || isDismissed) {
    return null
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-red-500/90 to-red-600/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-red-400/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-3xl">❤️</div>
            <div>
              <p className="text-white font-semibold text-sm">
                Enjoying this song?
              </p>
              <p className="text-white/90 text-xs">
                Support the artist by liking it on YouTube!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLikeClick}
              className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-50 transition-all duration-200 shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
              Like on YouTube
            </button>
            
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white p-2 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
