import type { Metadata } from 'next'
import PartnershipForm from './PartnershipForm'

export const metadata: Metadata = {
  title: 'Partner with Hilig',
  description: 'Propose a partnership with Hilig as a business, creator, host, event organizer, or community.',
}

export default function PartnershipsPage() {
  return (
    <section className="phase-page">
      <div className="phase-page-heading">
        <p className="eyebrow">MAKE SOMETHING MEANINGFUL</p>
        <h1 className="page-title">Let’s build together.</h1>
        <p>Have a business, creative project, event, or community that belongs on Hilig? Tell us about it and we’ll review your proposal.</p>
      </div>
      <div className="phase-panel"><PartnershipForm /></div>
    </section>
  )
}
