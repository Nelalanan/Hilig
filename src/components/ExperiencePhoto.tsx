import Image from 'next/image'
import { glyphFor } from '@/lib/categories'
import type { Experience } from '@/lib/types'

/**
 * Fills its (position: relative) parent. Listings without a photo get a
 * coloured placeholder instead of a broken image.
 */
export default function ExperiencePhoto({
  experience,
  sizes,
  priority = false,
}: {
  experience: Experience
  sizes: string
  priority?: boolean
}) {
  if (!experience.imageUrl) {
    return (
      <div className="photo-placeholder" role="img" aria-label={`${experience.category} experience`}>
        {glyphFor(experience.category)}
      </div>
    )
  }

  return (
    <Image
      src={experience.imageUrl}
      alt={experience.title}
      fill
      sizes={sizes}
      priority={priority}
    />
  )
}
