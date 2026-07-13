import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { artworks, dailyPicks } from "@/db/schema";
import { parisToday } from "@/lib/date";
import { sendEdition } from "@/lib/email";
import { generateStory } from "@/lib/story";
import { subscribers } from "@/db/schema";

export const maxDuration = 300;

// Vercel cron does not retry; runs can occasionally be missed or duplicated.
// Every step below is therefore idempotent and safe to re-run.
export async function GET(request: Request) {
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = parisToday();
  const log: string[] = [];

  let [pick] = await db
    .select()
    .from(dailyPicks)
    .where(eq(dailyPicks.date, today));

  if (!pick) {
    // Atomic claim — no interactive transaction needed (neon-http can't hold one),
    // and the slow AI call below never holds a lock.
    const [claimed] = await db
      .update(artworks)
      .set({ usedOn: today })
      .where(
        and(
          isNull(artworks.usedOn),
          eq(
            artworks.id,
            sql`(select id from artworks where used_on is null order by random() limit 1)`,
          ),
        ),
      )
      .returning();

    if (!claimed) {
      return Response.json({ ok: false, error: "artwork pool is empty" }, { status: 500 });
    }

    const story = await generateStory(claimed);
    const inserted = await db
      .insert(dailyPicks)
      .values({
        date: today,
        artworkId: claimed.id,
        story: story.story,
        teaser: story.teaser,
        storyStatus: story.status,
        model: story.model,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      pick = inserted[0];
      log.push(`picked artwork ${claimed.id} (story: ${story.status})`);
    } else {
      // A duplicate invocation won the race — release our claim and use its pick.
      await db
        .update(artworks)
        .set({ usedOn: null })
        .where(and(eq(artworks.id, claimed.id), eq(artworks.usedOn, today)));
      [pick] = await db.select().from(dailyPicks).where(eq(dailyPicks.date, today));
      log.push("duplicate invocation: reused existing pick");
    }
  }

  if (!pick) {
    return Response.json({ ok: false, error: "no pick for today" }, { status: 500 });
  }

  // Self-heal: a fallback story from a failed generation gets upgraded on the next run.
  if (pick.storyStatus === "fallback") {
    const [artwork] = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, pick.artworkId));
    const story = await generateStory(artwork);
    if (story.status === "ai") {
      [pick] = await db
        .update(dailyPicks)
        .set({
          story: story.story,
          teaser: story.teaser,
          storyStatus: "ai",
          model: story.model,
        })
        .where(eq(dailyPicks.date, today))
        .returning();
      log.push("upgraded fallback story to ai");
    }
  }

  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath(`/day/${today}`);

  if (!pick.emailSentAt) {
    const [artwork] = await db
      .select()
      .from(artworks)
      .where(eq(artworks.id, pick.artworkId));
    const recipients = await db
      .select({ email: subscribers.email, token: subscribers.token })
      .from(subscribers)
      .where(
        and(
          sql`${subscribers.confirmedAt} is not null`,
          isNull(subscribers.unsubscribedAt),
        ),
      );
    if (recipients.length > 0) {
      await sendEdition(pick, artwork, recipients);
      log.push(`edition sent to ${recipients.length} subscribers`);
    } else {
      log.push("no confirmed subscribers");
    }
    await db
      .update(dailyPicks)
      .set({ emailSentAt: new Date() })
      .where(eq(dailyPicks.date, today));
  }

  return Response.json({ ok: true, date: today, log });
}
