import { desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { artworks, dailyPicks, type Artwork, type DailyPick } from "@/db/schema";
import { parisToday } from "./date";

export type PickWithArtwork = { pick: DailyPick; artwork: Artwork };

// Readers fail soft: if the database is unreachable the site shows its
// empty state ("the museum opens soon" / yesterday via ISR) rather than a 500.

/** Latest published pick up to today (Paris) — a missed cron shows yesterday, never a blank page. */
export async function getCurrentPick(): Promise<PickWithArtwork | null> {
  try {
    const rows = await db
      .select({ pick: dailyPicks, artwork: artworks })
      .from(dailyPicks)
      .innerJoin(artworks, eq(dailyPicks.artworkId, artworks.id))
      .where(lte(dailyPicks.date, parisToday()))
      .orderBy(desc(dailyPicks.date))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getPickByDate(date: string): Promise<PickWithArtwork | null> {
  if (date > parisToday()) return null;
  try {
    const rows = await db
      .select({ pick: dailyPicks, artwork: artworks })
      .from(dailyPicks)
      .innerJoin(artworks, eq(dailyPicks.artworkId, artworks.id))
      .where(eq(dailyPicks.date, date))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getCollection(): Promise<PickWithArtwork[]> {
  try {
    return await db
      .select({ pick: dailyPicks, artwork: artworks })
      .from(dailyPicks)
      .innerJoin(artworks, eq(dailyPicks.artworkId, artworks.id))
      .where(lte(dailyPicks.date, parisToday()))
      .orderBy(desc(dailyPicks.date));
  } catch {
    return [];
  }
}
