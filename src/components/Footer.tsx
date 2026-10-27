import Link from 'next/link'

export default function Footer() {
  return (
    <footer>
      <Link className="brand footer-brand" href="/">
        <img className="brand-logo-image footer-logo-image" src="/hilig-logo.png" alt="Hilig — find what makes you come alive." />
      </Link>

      <p>Discover. Learn. Belong.</p>

      <div>
        <a href="#">Instagram</a>
        <a href="#">About</a>
        <Link href="/contact">Contact</Link>
        <Link href="/partnerships">Partner with us</Link>
      </div>

      <small>© {new Date().getFullYear()} Hilig. Made with care in the Philippines.</small>
    </footer>
  )
}
