import type { Metadata } from 'next'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Contact the Hilig team for support, feedback, and booking questions.',
}

export default function ContactPage() {
  return (
    <section className="phase-page">
      <div className="phase-page-heading">
        <p className="eyebrow">WE’RE HERE TO HELP</p>
        <h1 className="page-title">Let’s talk.</h1>
        <p>Questions about Hilig, a booking, or an idea you want to share? Send us a message and our team will review it.</p>
      </div>
      <div className="phase-panel"><ContactForm /></div>
    </section>
  )
}
