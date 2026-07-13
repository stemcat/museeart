# Le Musée Quotidien — [musee.art](https://musee.art)

A museum with one room, rehung every day.

One public-domain masterpiece per day — the work, its story, nothing else. Artworks come from the open-access collections of [The Metropolitan Museum of Art](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access), the [Art Institute of Chicago](https://www.artic.edu/open-access), and the [Cleveland Museum of Art](https://www.clevelandart.org/open-access).

## How it works

- A **Vercel cron** (`/api/cron/daily`, 23:30 UTC) picks one unused artwork from the pool, has Claude write its wall text (via Vercel AI Gateway), stores it, revalidates the pages, and sends the email edition via Resend. Every step is idempotent — the site's "day" is the Europe/Paris calendar date.
- **Pages**: `/` (today), `/day/[date]` (permalinks), `/collection` (the permanent collection), `/about`.
- **Stack**: Next.js App Router · Neon Postgres + Drizzle · AI SDK · Resend · Tailwind.

## Development

```bash
npm install
vercel env pull .env.local   # DATABASE_URL, CRON_SECRET, RESEND_API_KEY, …
npx drizzle-kit push         # apply schema
npx tsx scripts/ingest.ts    # fill the artwork pool (run locally, ~30 min)
npm run dev
```

Trigger a day manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```
