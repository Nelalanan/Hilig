import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="page-message">
      <p className="eyebrow">404</p>
      <h1 className="page-title">We couldn’t find that page</h1>
      <p>It may have moved, or the experience is no longer listed.</p>
      <Link className="button button-dark" href="/experiences">
        Browse experiences
      </Link>
    </section>
  )
}
