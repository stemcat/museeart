/**
 * Ingest public-domain highlights from The Met, the Art Institute of Chicago,
 * and the Cleveland Museum of Art into the artworks pool.
 *
 * Run locally (never deployed):
 *   npx tsx --env-file=.env.local scripts/ingest.ts [met|aic|cma]
 *
 * Env must come from --env-file: a dotenv call in this file would run AFTER
 * the hoisted ../src/db import, leaving the Neon client without DATABASE_URL.
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { artworks } from "../src/db/schema";

type NewArtwork = typeof artworks.$inferInsert;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let skippedRequests = 0;

async function getJson(url: string, init?: RequestInit, retries = 5): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 404) return null;
      // Everything else non-OK (403 rate bans, 429, 5xx) is worth backing off and retrying
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt > retries) {
        skippedRequests++;
        console.warn(`[skip] ${url} — ${(err as Error).message}`);
        return null;
      }
      await sleep(5000 * attempt);
    }
  }
}

// Small chunks keep each HTTP request to Neon well under payload limits —
// metadata jsonb rows (especially CMA's) can be very large.
async function upsert(rows: NewArtwork[], retries = 4) {
  for (let i = 0; i < rows.length; i += 20) {
    const chunk = rows.slice(i, i + 20);
    for (let attempt = 1; ; attempt++) {
      try {
        await doUpsert(chunk);
        break;
      } catch (err) {
        if (attempt > retries) throw err;
        console.warn(`[db] upsert failed (attempt ${attempt}), retrying…`);
        await sleep(3000 * attempt);
      }
    }
  }
}

async function doUpsert(rows: NewArtwork[]) {
  await db
    .insert(artworks)
    .values(rows)
    .onConflictDoUpdate({
      target: [artworks.source, artworks.sourceId],
      set: {
        title: sql`excluded.title`,
        artist: sql`excluded.artist`,
        dateDisplay: sql`excluded.date_display`,
        medium: sql`excluded.medium`,
        creditLine: sql`excluded.credit_line`,
        sourceUrl: sql`excluded.source_url`,
        imageUrl: sql`excluded.image_url`,
        imageSmallUrl: sql`excluded.image_small_url`,
        metadata: sql`excluded.metadata`,
      },
    });
}

// ---------------------------------------------------------------- The Met

async function ingestMet() {
  console.log("[met] searching highlights…");
  const search = (await getJson(
    "https://collectionapi.metmuseum.org/public/collection/v1/search?isHighlight=true&hasImages=true&q=*",
  )) as { objectIDs?: number[] } | null;
  const ids = search?.objectIDs ?? [];
  console.log(`[met] ${ids.length} highlight objects to inspect`);

  let kept = 0;
  let batch: NewArtwork[] = [];
  for (const [i, id] of ids.entries()) {
    // isPublicDomain is only available per object, not as a search filter
    const obj = (await getJson(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
    )) as Record<string, unknown> | null;
    await sleep(400); // the Met 403-bans sustained crawls despite the stated 80/s cap — go slow

    if (!obj || obj.isPublicDomain !== true || !obj.primaryImage) continue;
    batch.push({
      source: "met",
      sourceId: String(id),
      title: (obj.title as string) || "Untitled",
      artist: (obj.artistDisplayName as string) || null,
      dateDisplay: (obj.objectDate as string) || null,
      medium: (obj.medium as string) || null,
      creditLine: (obj.creditLine as string) || "The Metropolitan Museum of Art, New York",
      museumName: "The Metropolitan Museum of Art",
      sourceUrl: (obj.objectURL as string) || `https://www.metmuseum.org/art/collection/search/${id}`,
      imageUrl: obj.primaryImage as string,
      imageSmallUrl: (obj.primaryImageSmall as string) || (obj.primaryImage as string),
      metadata: obj,
    });
    kept++;
    if (batch.length >= 50) {
      await upsert(batch);
      batch = [];
      console.log(`[met] ${i + 1}/${ids.length} inspected, ${kept} kept`);
    }
  }
  await upsert(batch);
  console.log(`[met] done — ${kept} artworks`);
}

// ------------------------------------------------- Art Institute of Chicago

async function ingestAic() {
  const headers = {
    "Content-Type": "application/json",
    "AIC-User-Agent": "musee.art (domonkevin@gmail.com)",
  };
  const fields =
    "id,title,artist_display,date_display,medium_display,credit_line,image_id";
  let page = 1;
  let kept = 0;
  for (;;) {
    const data = (await getJson(
      `https://api.artic.edu/api/v1/artworks/search?fields=${fields}&limit=100&page=${page}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: {
            bool: {
              must: [
                { term: { is_public_domain: true } },
                { term: { is_boosted: true } },
              ],
            },
          },
        }),
      },
    )) as { data?: Record<string, unknown>[]; pagination?: { total_pages: number } } | null;

    const rows = data?.data ?? [];
    if (rows.length === 0) break;

    await upsert(
      rows
        .filter((r) => r.image_id)
        .map((r) => ({
          source: "aic" as const,
          sourceId: String(r.id),
          title: (r.title as string) || "Untitled",
          artist: (r.artist_display as string) || null,
          dateDisplay: (r.date_display as string) || null,
          medium: (r.medium_display as string) || null,
          creditLine: (r.credit_line as string) || "The Art Institute of Chicago",
          museumName: "The Art Institute of Chicago",
          sourceUrl: `https://www.artic.edu/artworks/${r.id}`,
          imageUrl: `https://www.artic.edu/iiif/2/${r.image_id}/full/1686,/0/default.jpg`,
          imageSmallUrl: `https://www.artic.edu/iiif/2/${r.image_id}/full/843,/0/default.jpg`,
          metadata: r,
        })),
    );
    kept += rows.filter((r) => r.image_id).length;
    console.log(`[aic] page ${page}, ${kept} kept`);
    if (page >= (data?.pagination?.total_pages ?? 1)) break;
    page++;
    await sleep(1100); // 60 req/min anonymous throttle
  }
  console.log(`[aic] done — ${kept} artworks`);
}

// ---------------------------------------------------- Cleveland Museum of Art

async function ingestCma() {
  let skip = 0;
  let kept = 0;
  for (;;) {
    const data = (await getJson(
      `https://openaccess-api.clevelandart.org/api/artworks/?cc0&highlight=1&has_image=1&limit=500&skip=${skip}`,
    )) as { data?: Record<string, unknown>[] } | null;
    const rows = data?.data ?? [];
    if (rows.length === 0) break;

    await upsert(
      rows
        .filter((r) => {
          const images = r.images as Record<string, { url?: string }> | null;
          return images?.web?.url;
        })
        .map((r) => {
          const images = r.images as Record<string, { url?: string }>;
          const creators = r.creators as { description?: string }[] | null;
          return {
            source: "cma" as const,
            sourceId: String(r.id),
            title: (r.title as string) || "Untitled",
            artist: creators?.[0]?.description || null,
            dateDisplay: (r.creation_date as string) || null,
            medium: (r.technique as string) || null,
            creditLine: ((r.creditline as string) ||
              "The Cleveland Museum of Art") as string,
            museumName: "The Cleveland Museum of Art",
            sourceUrl: (r.url as string) || `https://www.clevelandart.org/art/${r.accession_number}`,
            imageUrl: images.print?.url || images.web!.url!,
            imageSmallUrl: images.web!.url!,
            metadata: r,
          };
        }),
    );
    kept += rows.length;
    console.log(`[cma] skip ${skip}, ${kept} inspected`);
    skip += 500;
    await sleep(500);
  }
  console.log(`[cma] done — ${kept} artworks`);
}

// -----------------------------------------------------------------------

async function main() {
  const only = process.argv[2];
  if (only && !["met", "aic", "cma"].includes(only)) {
    console.error("usage: tsx scripts/ingest.ts [met|aic|cma]");
    process.exit(1);
  }
  if (!only || only === "cma") await ingestCma();
  if (!only || only === "aic") await ingestAic();
  if (!only || only === "met") await ingestMet();
  console.log(
    `ingestion complete${skippedRequests ? ` — ${skippedRequests} requests skipped after retries` : ""}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
