'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

type RevealProps = {
  children: ReactNode
  /** Classes for the wrapper, so it can stay the layout element (e.g. "experience-grid"). */
  className?: string
  /** Extra delay in ms before the animation starts. */
  delay?: number
  /** Animate the direct children one after another instead of the wrapper. */
  stagger?: boolean
}

/**
 * Fades content up as it scrolls into view.
 *
 * - Content is fully visible on the server and without JavaScript.
 * - Anything already on screen when the page loads is left alone.
 * - Visitors who prefer reduced motion never see the animation.
 */
export default function Reveal({
  children,
  className = '',
  delay = 0,
  stagger = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reduceMotion || typeof IntersectionObserver === 'undefined') return

    // Already on screen (or scrolled past) at load: don't hide it.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return

    setState('hidden')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown')
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const classes = [
    className,
    'reveal',
    stagger ? 'reveal-stagger' : '',
    `reveal-${state}`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={ref}
      className={classes}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
