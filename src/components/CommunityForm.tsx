
import type { ReactNode } from 'react'

type CommunityFormProps = {
  action: (formData: FormData) => void | Promise<void>
  submitLabel: string
  initial?: {
    id: string
    slug: string
    name: string
    description: string
    interests: string[]
    imageUrl: string | null
    location: string | null
    status: 'draft' | 'published' | 'archived'
  }
  error?: ReactNode
}

export default function CommunityForm({
  action,
  submitLabel,
  initial,
  error,
}: CommunityFormProps) {
  return (
    <form action={action} className="community-form">
      {initial && (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="current_slug" value={initial.slug} />
        </>
      )}

      <label htmlFor="community-name">Community name</label>
      <input
        id="community-name"
        name="name"
        required
        minLength={3}
        maxLength={80}
        defaultValue={initial?.name ?? ''}
        placeholder="e.g. Bacolod Art Lovers"
      />

      <label htmlFor="community-description">Description</label>
      <textarea
        id="community-description"
        name="description"
        required
        minLength={10}
        maxLength={3000}
        rows={6}
        defaultValue={initial?.description ?? ''}
        placeholder="Tell people what this community is about..."
      />

      <label htmlFor="community-interests">Interests</label>
      <input
        id="community-interests"
        name="interests"
        defaultValue={initial?.interests.join(', ') ?? ''}
        placeholder="Painting, Drawing, Creative Projects"
      />
      <p className="community-form-help">
        Separate interests with commas. Add up to 10 interests.
      </p>

      <label htmlFor="community-location">Location (optional)</label>
      <input
        id="community-location"
        name="location"
        maxLength={120}
        defaultValue={initial?.location ?? ''}
        placeholder="e.g. Bacolod City"
      />

      <label htmlFor="community-image">Image URL (optional)</label>
      <input
        id="community-image"
        name="image_url"
        type="url"
        defaultValue={initial?.imageUrl ?? ''}
        placeholder="https://example.com/community-image.jpg"
      />
      <p className="community-form-help">
        Use a direct image URL beginning with https:// or http://.
      </p>

      {error}

      <div className="community-form-actions">
        <button
          className="button button-dark"
          type="submit"
          name="intent"
          value="draft"
        >
          Save draft
        </button>

        <button
          className="button button-dark"
          type="submit"
          name="intent"
          value="publish"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
