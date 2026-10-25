export const CATEGORIES = [
  { name: 'Pottery', glyph: '◎' },
  { name: 'Painting', glyph: '✦' },
  { name: 'Cooking', glyph: '⌁' },
  { name: 'Music', glyph: '♫' },
  { name: 'Outdoors', glyph: '⌂' },
  { name: 'Wellness', glyph: '◌' },
] as const

export type Category = (typeof CATEGORIES)[number]['name']

export function isCategory(value: string | undefined): value is Category {
  return CATEGORIES.some((c) => c.name === value)
}

export function glyphFor(category: Category): string {
  return CATEGORIES.find((c) => c.name === category)?.glyph ?? '✦'
}
