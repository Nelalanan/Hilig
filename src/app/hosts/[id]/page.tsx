
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type HostPageProps = {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'Host Profile | Hilig',
}

export const dynamic = 'force-dynamic'

export default async function HostProfilePage({
  params,
}: HostPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: host, error: hostError } = await supabase
    .from('hosts')
    .select('id, name, bio, avatar_url')
    .eq('id', id)
    .maybeSingle()

  if (hostError) {
    console.error('Failed to load host:', hostError.message)
    throw new Error('Unable to load this host profile.')
  }

  if (!host) {
    notFound()
  }

  const { data: experiences, error: experiencesError } = await supabase
    .from('experiences')
    .select(`
      id,
      slug,
      title,
      category,
      tag,
      description,
      location,
      price_php,
      image_url,
      duration_minutes
    `)
    .eq('host_id', host.id)
    .eq('is_published', true)
    .order('title', { ascending: true })

  if (experiencesError) {
    console.error(
      'Failed to load host experiences:',
      experiencesError.message
    )
    throw new Error('Unable to load this host’s experiences.')
  }

  return (
    <main className="host-profile">
      <section className="host-profile-header">
        <Link href="/experiences" className="host-back-link">
          ← Explore experiences
        </Link>

        <div className="host-profile-intro">
          {host.avatar_url ? (
            <Image
              src={host.avatar_url}
              alt={`${host.name}'s profile`}
              width={120}
              height={120}
              className="host-avatar"
            />
          ) : (
            <div className="host-avatar host-avatar-placeholder">
              {host.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <p className="host-eyebrow">MEET YOUR HOST</p>
            <h1>{host.name}</h1>
            <p className="host-bio">
              {host.bio || 'Discover the experiences this host offers.'}
            </p>
          </div>
        </div>
      </section>

      <section className="host-experiences">
        <div className="host-section-heading">
          <div>
            <p className="host-eyebrow">MADE FOR YOU</p>
            <h2>Experiences by {host.name}</h2>
          </div>
          <span>{experiences?.length ?? 0} experiences</span>
        </div>

        {!experiences?.length ? (
          <p className="host-empty">
            This host has no published experiences yet. Check back soon!
          </p>
        ) : (
          <div className="host-experience-grid">
            {experiences.map((experience) => (
              <Link
                key={experience.id}
                href={`/experiences/${experience.slug}`}
                className="host-experience-card"
              >
                {experience.image_url ? (
                  <div className="host-experience-image">
                    <Image
                      src={experience.image_url}
                      alt={experience.title}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="host-experience-image host-image-placeholder">
                    Hilig
                  </div>
                )}

                <div className="host-experience-content">
                  {experience.category && (
                    <p className="host-experience-category">
                      {experience.category}
                    </p>
                  )}

                  <h3>{experience.title}</h3>

                  {experience.location && (
                    <p className="host-experience-location">
                      {experience.location}
                    </p>
                  )}

                  <p className="host-experience-description">
                    {experience.description}
                  </p>

                  <div className="host-experience-footer">
                    <strong>
                      ₱{Number(experience.price_php).toLocaleString('en-PH')}
                    </strong>

                    {experience.duration_minutes && (
                      <span>{experience.duration_minutes} min</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
