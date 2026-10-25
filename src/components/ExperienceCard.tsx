import Link from 'next/link'
import { formatPrice, formatSessionShort } from '@/lib/format'
import type { Experience } from '@/lib/types'
import ExperiencePhoto from './ExperiencePhoto'
import Icon from './Icon'
import SaveButton from './SaveButton'

export default function ExperienceCard({
  experience,
  priority = false,
}: {
  experience: Experience
  priority?: boolean
}) {
  const href = `/experiences/${experience.slug}`
  const nextSession = experience.sessions[0]

  return (
    <article className="experience-card">
      <div className="card-image">
        {/* Image link has the same destination as the text link below, so keyboard users skip it. */}
        <Link href={href} className="card-image-link" tabIndex={-1} aria-hidden="true">
          <ExperiencePhoto
            experience={experience}
            priority={priority}
            sizes="(max-width: 620px) 100vw, (max-width: 1100px) 50vw, 400px"
          />
        </Link>

        {experience.tag && <span className="tag">{experience.tag}</span>}
        <SaveButton experienceId={experience.id} />
      </div>

      <Link href={href} className="card-content">
        <p className="card-type">{experience.category.toUpperCase()}</p>
        <h3>{experience.title}</h3>
        <p className="host">with {experience.hostName}</p>

        <div className="detail-row">
          <span>
            <Icon name="calendar" size={16} />
            {nextSession ? formatSessionShort(nextSession.startsAt) : 'No dates yet'}
          </span>
          <span>
            <Icon name="pin" size={16} />
            {experience.location}
          </span>
        </div>

        <div className="card-footer">
          <span>
            <b>{formatPrice(experience.pricePhp)}</b> / person
          </span>

          {experience.reviewCount > 0 ? (
            <span className="rating">
              <Icon name="star" size={15} /> {experience.ratingAvg.toFixed(1)}{' '}
              <small>({experience.reviewCount})</small>
            </span>
          ) : (
            <span className="rating new">New</span>
          )}
        </div>
      </Link>
    </article>
  )
}
