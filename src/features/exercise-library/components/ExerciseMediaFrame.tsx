import { useEffect, useState } from 'react'
import { getExerciseMediaUrls } from '@/lib/exercise-media'
import type { ExerciseWithParsedFields } from '@/lib/types/database'

interface ExerciseMediaFrameProps {
  exercise: ExerciseWithParsedFields
  alt: string
  frameClassName: string
  imageClassName: string
  iconClassName: string
}

export default function ExerciseMediaFrame({
  exercise,
  alt,
  frameClassName,
  imageClassName,
  iconClassName,
}: ExerciseMediaFrameProps) {
  const { gifUrl, previewImageUrl } = getExerciseMediaUrls(exercise)
  const [mediaSrc, setMediaSrc] = useState<string | null>(gifUrl || previewImageUrl)
  const [isFallbackMedia, setIsFallbackMedia] = useState(Boolean(!gifUrl && previewImageUrl))

  useEffect(() => {
    setMediaSrc(gifUrl || previewImageUrl)
    setIsFallbackMedia(Boolean(!gifUrl && previewImageUrl))
  }, [gifUrl, previewImageUrl])

  const handleMediaError = () => {
    if (!isFallbackMedia && previewImageUrl) {
      setMediaSrc(previewImageUrl)
      setIsFallbackMedia(true)
      return
    }

    // No usable media: drop the <img> so the fallback icon behind it shows.
    setMediaSrc(null)
    setIsFallbackMedia(true)
  }

  return (
    <div className={frameClassName}>
      {mediaSrc && (
        <img
          src={mediaSrc}
          alt={alt}
          className={imageClassName}
          loading="lazy"
          decoding="async"
          onError={handleMediaError}
        />
      )}
      <div className={iconClassName}>
        <svg className="h-12 w-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      </div>
    </div>
  )
}
