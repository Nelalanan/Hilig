import type { Experience } from './types'

/**
 * Sample listings so the site works before Supabase is connected.
 * supabase/seed.sql inserts the same listings into the real database.
 * Delete both before launch: these are demo hosts, not real businesses.
 */

// Philippine time has no daylight saving, so it is always UTC+8.
function sessionAt(daysAhead: number, hour: number, minute = 0): string {
  const manilaNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const utc = Date.UTC(
    manilaNow.getUTCFullYear(),
    manilaNow.getUTCMonth(),
    manilaNow.getUTCDate() + daysAhead,
    hour - 8,
    minute,
  )
  return new Date(utc).toISOString()
}

type SeedSession = { daysAhead: number; hour: number; minute?: number; capacity: number; booked: number }

function sessions(slug: string, items: SeedSession[]) {
  return items.map((s, i) => ({
    id: `${slug}-${i + 1}`,
    startsAt: sessionAt(s.daysAhead, s.hour, s.minute ?? 0),
    capacity: s.capacity,
    booked: s.booked,
  }))
}

export function seedExperiences(): Experience[] {
  return [
    {
      id: 'seed-pottery',
      slug: 'wheel-thrown-pottery-for-beginners',
      title: 'Wheel-Thrown Pottery for Beginners',
      category: 'Pottery',
      tag: 'Materials included',
      description:
        'Sit down at the wheel and learn to center, open and pull up a clay form in a relaxed small-group class. Our instructor walks you through each step, so nobody needs any experience. You will make two pieces to be trimmed, glazed and fired by the studio.',
      hostId: null,
      hostName: 'Clay House Studio',
      location: 'Makati',
      pricePhp: 1250,
      imageUrl: 'https://images.unsplash.com/photo-1480355781839-51097c7d4f9f?auto=format&fit=crop&w=1400&q=80',
      durationMinutes: 150,
      includes: ['Clay and all tools', 'Apron while you work', 'Two pieces glazed and fired', 'Tea and coffee'],
      ratingAvg: 0,
      reviewCount: 0,
      sessions: sessions('pottery', [
        { daysAhead: 3, hour: 10, capacity: 8, booked: 5 },
        { daysAhead: 10, hour: 10, capacity: 8, booked: 1 },
        { daysAhead: 17, hour: 14, capacity: 8, booked: 0 },
      ]),
    },
    {
      id: 'seed-sourdough',
      slug: 'sourdough-from-scratch',
      title: 'Sourdough from Scratch',
      category: 'Cooking',
      tag: 'Beginner friendly',
      description:
        'Mix, fold and shape your own loaf while learning how a sourdough starter actually works. You will leave with a loaf ready to bake, a jar of starter and a recipe card for practising at home.',
      hostId: null,
      hostName: 'The Daily Knead',
      location: 'Quezon City',
      pricePhp: 980,
      imageUrl: 'https://images.unsplash.com/photo-1613292136906-32a449d4ec7b?auto=format&fit=crop&w=1400&q=80',
      durationMinutes: 180,
      includes: ['Ingredients and equipment', 'Starter to take home', 'Printed recipe card', 'Light snacks'],
      ratingAvg: 0,
      reviewCount: 0,
      sessions: sessions('sourdough', [
        { daysAhead: 4, hour: 14, capacity: 10, booked: 10 },
        { daysAhead: 11, hour: 14, capacity: 10, booked: 3 },
      ]),
    },
    {
      id: 'seed-botanicals',
      slug: 'paint-your-own-botanicals',
      title: 'Paint Your Own Botanicals',
      category: 'Painting',
      tag: 'No experience needed',
      description:
        'A calm evening of watercolour and plants. You will learn simple brush techniques for leaves and petals, then paint a small botanical piece to frame and keep. Paints, paper and brushes are all provided.',
      hostId: null,
      hostName: 'Common Room',
      location: 'Pasig',
      pricePhp: 750,
      imageUrl: 'https://images.unsplash.com/photo-1593382067395-ace3045a1547?auto=format&fit=crop&w=1400&q=80',
      durationMinutes: 120,
      includes: ['Paints, paper and brushes', 'Fresh plant references', 'Your finished painting', 'Drink of your choice'],
      ratingAvg: 0,
      reviewCount: 0,
      sessions: sessions('botanicals', [
        { daysAhead: 2, hour: 18, minute: 30, capacity: 12, booked: 9 },
        { daysAhead: 9, hour: 18, minute: 30, capacity: 12, booked: 2 },
      ]),
    },
    {
      id: 'seed-ukulele',
      slug: 'ukulele-jam-night',
      title: 'Ukulele Jam Night',
      category: 'Music',
      tag: 'Instruments provided',
      description:
        'Learn four chords, then play along to a handful of easy songs with the whole group. No instrument and no experience needed. It is a loose, friendly evening aimed at people who have always wanted to try.',
      hostId: null,
      hostName: 'Kanto Strings',
      location: 'Quezon City',
      pricePhp: 600,
      imageUrl: null,
      durationMinutes: 120,
      includes: ['Ukulele to use during class', 'Chord and song sheet', 'Snacks'],
      ratingAvg: 0,
      reviewCount: 0,
      sessions: sessions('ukulele', [
        { daysAhead: 5, hour: 19, capacity: 10, booked: 4 },
        { daysAhead: 12, hour: 19, capacity: 10, booked: 0 },
      ]),
    },
    {
      id: 'seed-hike',
      slug: 'sunrise-hike-antipolo',
      title: 'Sunrise Hike in Antipolo',
      category: 'Outdoors',
      tag: 'Small group',
      description:
        'An easy early-morning trail walk ending with a view over the city as the sun comes up. A local guide sets a gentle pace and points out plants and birds along the way. Suitable for first-time hikers.',
      hostId: null,
      hostName: 'Trail Mix PH',
      location: 'Antipolo',
      pricePhp: 500,
      imageUrl: null,
      durationMinutes: 240,
      includes: ['Local guide', 'Trail snacks and water', 'Group photo'],
      ratingAvg: 0,
      reviewCount: 0,
      sessions: sessions('hike', [
        { daysAhead: 6, hour: 4, minute: 30, capacity: 15, booked: 7 },
        { daysAhead: 13, hour: 4, minute: 30, capacity: 15, booked: 0 },
      ]),
    },
    {
      id: 'seed-yoga',
      slug: 'slow-sunday-yoga',
      title: 'Slow Sunday Yoga',
      category: 'Wellness',
      tag: 'All levels',
      description:
        'A gentle one-hour flow focused on stretching, breathing and unwinding before the week starts. Mats and props are provided, and the teacher offers easier and harder options for every pose.',
      hostId: null,
      hostName: 'Still Studio',
      location: 'Taguig',
      pricePhp: 700,
      imageUrl: null,
      durationMinutes: 75,
      includes: ['Mat and props', 'Herbal tea after class'],
      ratingAvg: 0,
      reviewCount: 0,
      sessions: sessions('yoga', [
        { daysAhead: 7, hour: 9, capacity: 12, booked: 6 },
        { daysAhead: 14, hour: 9, capacity: 12, booked: 0 },
      ]),
    },
  ]
}
