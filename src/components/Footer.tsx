import Link from 'next/link'

export default function Footer() {
  return (
    <footer>
      <Link className="brand footer-brand" href="/">
        <span className="brand-mark">h</span>
        <span>hilig.</span>
      </Link>

      <p>Discover. Learn. Belong.</p>

      <div>
        <a href="#">Instagram</a>
        <a href="#">About</a>
        <a href="#">Help</a>
      </div>

      <small>© {new Date().getFullYear()} Hilig. Made with care in the Philippines.</small>
    </footer>
  )
}
