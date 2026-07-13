/**
 * Mirror Art Institute of Chicago images to Vercel Blob.
 *
 * AIC's IIIF endpoint 403s any client that doesn't send their documented
 * AIC-User-Agent header — which browsers, next/image, satori (OG cards), and
 * email image proxies never do. So we fetch each image once here (with the
 * header) and serve it from Blob forever.
 *
 * Run locally:  npx tsx --env-file=.env.local scripts/mirror-aic.ts
 */
import { put } from "@vercel/blob";
import { eq, like, not, and } from "drizzle-orm";
import { db } from "../src/db";
import { artworks } from "../src/db/schema";

const HEADERS = { "AIC-User-Agent": "musee.art (domonkevin@gmail.com)" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(url: string, retries = 4): Promise<Blob | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.status === 403 || res.status === 404) return null; // size not available
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (err) {
      if (attempt > retries) {
        console.warn(`[skip] ${url} — ${(err as Error).message}`);
        return null;
      }
      await sleep(3000 * attempt);
    }
  }
}

async function mirror(sourceId: string, iiifUrl: string, suffix: string) {
  const image = await fetchImage(iiifUrl);
  if (!image) return null;
  const { url } = await put(`aic/${sourceId}-${suffix}.jpg`, image, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/jpeg",
  });
  return url;
}

async function main() {
  const rows = await db
    .select()
    .from(artworks)
    .where(
      and(
        eq(artworks.source, "aic"),
        not(like(artworks.imageUrl, "%blob.vercel-storage.com%")),
      ),
    );
  console.log(`${rows.length} AIC artworks to mirror`);

  let done = 0;
  let dropped = 0;
  for (const row of rows) {
    const hero = await mirror(row.sourceId, row.imageUrl, "hero");
    await sleep(300);
    const small = await mirror(row.sourceId, row.imageSmallUrl, "small");
    await sleep(300);

    // The 843px size is IIIF-guaranteed; a missing hero can fall back to it.
    const heroUrl = hero ?? small;
    const smallUrl = small ?? hero;
    if (!heroUrl || !smallUrl) {
      // Neither size fetchable — remove from the pool rather than serve a broken day
      await db.delete(artworks).where(eq(artworks.id, row.id));
      dropped++;
      continue;
    }
    await db
      .update(artworks)
      .set({ imageUrl: heroUrl, imageSmallUrl: smallUrl })
      .where(eq(artworks.id, row.id));
    done++;
    if (done % 25 === 0) console.log(`${done}/${rows.length} mirrored`);
  }
  console.log(`done — ${done} mirrored, ${dropped} dropped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
