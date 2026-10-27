import Link from 'next/link'
import Icon from '@/components/Icon'
import type { CommunityGroup } from '@/lib/community'

export default function CommunityCard({ group }: { group: CommunityGroup }) {
  return (
    <article className="experience-card unified-listing-card">
      <Link href={`/community/${encodeURIComponent(group.slug)}`} className="unified-card-link" aria-label={`View community: ${group.name}`}>
        <div className="card-image">
          {group.imageUrl ? <img src={group.imageUrl} alt="" loading="lazy" /> : <div className="unified-card-placeholder"><Icon name="users" size={32} /><span>Hilig Community</span></div>}
          {group.interests[0] && <span className="tag">{group.interests[0]}</span>}
        </div>
        <div className="card-content">
          <p className="card-type">COMMUNITY</p>
          <h3>{group.name}</h3>
          <p className="community-card-description">{group.description}</p>
          <div className="detail-row">
            {group.location && <span><Icon name="pin" size={16} />{group.location}</span>}
            <span><Icon name="users" size={16} />Shared interests</span>
          </div>
          <div className="card-footer"><span className="community-card-creator">By {group.creatorName}</span><span className="unified-card-action">Explore <Icon name="arrow" size={15} /></span></div>
        </div>
      </Link>
    </article>
  )
}
