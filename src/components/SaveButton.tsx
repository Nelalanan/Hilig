'use client'

import { useEffect, useState } from 'react'
import Icon from './Icon'

const STORAGE_KEY = 'hilig:saved'

function readSaved(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Heart button. For now the choice is remembered in this browser only.
 * When login exists it will save to the saved_experiences table instead.
 */
export default function SaveButton({ experienceId }: { experienceId: string }) {
  const [saved, setSaved] = useState(false)

  // Read after mount so server and browser render the same HTML first.
  useEffect(() => {
    setSaved(readSaved().includes(experienceId))
  }, [experienceId])

  const toggle = () => {
    const current = readSaved()
    const next = current.includes(experienceId)
      ? current.filter((id) => id !== experienceId)
      : [...current, experienceId]

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private mode or storage full: the heart still toggles for this visit.
    }
    setSaved(next.includes(experienceId))
  }

  return (
    <button
      type="button"
      className={saved ? 'save saved' : 'save'}
      aria-label={saved ? 'Remove from saved' : 'Save experience'}
      aria-pressed={saved}
      onClick={toggle}
    >
      <Icon name="heart" size={19} />
    </button>
  )
}
