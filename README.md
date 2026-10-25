# Hilig

Hobby experiences marketplace for Metro Manila. Next.js (App Router), TypeScript, Supabase.

## Run it

Needs Node 20.19+ (check with `node -v`).

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no configuration the site runs on built-in sample listings.

## Connect Supabase

1. Create a project at https://supabase.com. Pick the **Southeast Asia (Singapore)** region.
2. In the dashboard open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. Optional sample data: paste and run `supabase/seed.sql`.
4. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings -> API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Restart `npm run dev`. The site now reads from your database.

If Supabase is configured but the tables are missing or empty, the pages show no listings and the terminal prints the reason.

## Project layout

```
src/app/                 pages (home, /experiences, /experiences/[slug], /login placeholder)
src/components/          Header, Footer, ExperienceCard, SaveButton, Icon
src/lib/data.ts          all reads go through here (Supabase, or sample data)
src/lib/seed.ts          sample listings used when Supabase is not configured
supabase/schema.sql      tables, security rules, signup trigger
supabase/seed.sql        sample data for the database
```

## Database

| Table | Purpose |
|---|---|
| `profiles` | one row per user, created automatically on signup |
| `hosts` | a business or person running experiences |
| `experiences` | the listings (published only after admin approval) |
| `sessions` | dates and spots for an experience; the database refuses overbooking |
| `bookings` | a guest's reservation and payment status |
| `reviews` | one per booking |
| `saved_experiences` | a user's hearted listings |

Row level security is on for every table. Guests cannot create bookings, publish listings, change their own role, or edit spot counts. Those happen only through our server code.

## Before launch

- Delete the sample hosts and listings (`seed.sql` / `seed.ts`).
- Add real photos (Supabase Storage) instead of the Unsplash links.
- The Communities section on the home page is placeholder content.
- Add terms, privacy and refund pages.
