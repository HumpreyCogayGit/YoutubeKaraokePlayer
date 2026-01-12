import YouTube, { YouTubeProps } from 'react-youtube'

interface VideoPlayerProps {
  videoId: string
  onVideoEnd?: () => void
}

const VideoPlayer = ({ videoId, onVideoEnd }: VideoPlayerProps) => {
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin
    },
  }

  const onEnd: YouTubeProps['onEnd'] = () => {
    if (onVideoEnd) {
      onVideoEnd()
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 h-full flex flex-col">
      <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
        {videoId ? (
          <div className="w-full h-full">
            <YouTube
              videoId={videoId}
              opts={opts}
              onEnd={onEnd}
              className="w-full h-full"
              iframeClassName="w-full h-full"
            />
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="w-24 h-24 text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-300 text-lg">
              Select a song from the search results to start singing!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPlayer
