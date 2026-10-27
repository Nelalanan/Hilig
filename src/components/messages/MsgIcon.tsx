import type { ReactNode } from 'react'

// A few extra icons for the messages screens, kept separate so the shared
// Icon component doesn't need to change.
const paths: Record<string, ReactNode> = {
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </>
  ),
  back: <path d="m15 18-6-6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chat: (
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5Z" />
  ),
}

export type MsgIconName = keyof typeof paths

export function MsgIcon({
  name,
  size = 20,
}: {
  name: MsgIconName
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
