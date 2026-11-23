import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { and, eq, isNotNull, like, or, sql } from "drizzle-orm";
import { db } from "../src/db";
import { artworks, dailyPicks } from "../src/db/schema";
import { loadMetCatalogueLinks, MetRateLimitError, resolveMetImages } from "./lib/met-images";

async function main() {
  const { values: options } = parseArgs({
    options: { apply: { type: "boolean" }, all: { type: "boolean" } },
  });
  const linksFile = process.env.MET_CATALOGUE_LINKS;
  const links = linksFile ? await loadMetCatalogueLinks(linksFile) : undefined;
  const legacy = "https://images.metmuseum.org/%";
  const rows = await db
    .select({
      id: artworks.id,
      sourceId: artworks.sourceId,
      imageUrl: artworks.imageUrl,
      imageSmallUrl: artworks.imageSmallUrl,
    })
    .from(artworks)
    .leftJoin(dailyPicks, eq(dailyPicks.artworkId, artworks.id))
    .where(and(
      eq(artworks.source, "met"),
      or(like(artworks.imageUrl, legacy), like(artworks.imageSmallUrl, legacy)),
      options.all ? undefined : isNotNull(dailyPicks.artworkId),
    ))
    .orderBy(sql`${dailyPicks.date} desc nulls last`, artworks.id);

  const action = options.apply ? "updated" : "verified";
  console.log(`Checking ${rows.length} legacy Met records (${options.apply ? "apply" : "dry run"})`);
  let count = 0;
  for (const row of rows) {
    await sleep(400); // Pace the bulk checks like the regular Met import.
    let images;
    try {
      images = await resolveMetImages(row.sourceId, links);
    } catch (error) {
      if (error instanceof MetRateLimitError) throw error;
      console.warn(`[skip] ${row.sourceId}: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    if (options.apply) {
      // A concurrent repair or import may have changed this artwork since the scan.
      const updated = await db.update(artworks).set(images).where(and(
        eq(artworks.id, row.id),
        eq(artworks.imageUrl, row.imageUrl),
        eq(artworks.imageSmallUrl, row.imageSmallUrl),
      )).returning({ id: artworks.id });
      if (!updated.length) {
        console.warn(`[skip] ${row.sourceId} changed during the scan`);
        continue;
      }
    }
    count++;
    if (count % 100 === 0) console.log(`${count} ${action}`);
  }
  console.log(`${count}/${rows.length} ${action}`);
  if (count !== rows.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
