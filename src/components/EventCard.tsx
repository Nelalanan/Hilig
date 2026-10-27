import Link from 'next/link'
import Icon from '@/components/Icon'
import type { HiligEvent } from '@/lib/events'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

export default function EventCard({ event }: { event: HiligEvent }) {
  return (
    <article className="experience-card unified-listing-card">
      <Link href={`/events/${encodeURIComponent(event.slug)}`} className="unified-card-link" aria-label={`View event: ${event.title}`}>
        <div className="card-image">
          {event.imageUrl ? <img src={event.imageUrl} alt="" loading="lazy" /> : <div className="unified-card-placeholder"><Icon name="calendar" size={32} /><span>Hilig Events</span></div>}
          {event.category && <span className="tag">{event.category}</span>}
        </div>
        <div className="card-content">
          <p className="card-type">UPCOMING EVENT</p>
          <h3>{event.title}</h3>
          <p className="host">Hosted by {event.hostName}</p>
          <div className="detail-row">
            <span><Icon name="calendar" size={16} />{formatDate(event.startsAt)}</span>
            <span><Icon name="pin" size={16} />{event.location}</span>
          </div>
          <div className="card-footer"><span><b>{event.pricePhp === 0 ? 'Free' : `₱${event.pricePhp.toLocaleString('en-PH')}`}</b>{event.pricePhp > 0 ? ' / person' : ''}</span><span className="unified-card-action">View event <Icon name="arrow" size={15} /></span></div>
        </div>
      </Link>
    </article>
  )
}
