import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { sendConfirmationEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email().max(320) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "invalid email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const token = randomUUID();

  // Re-subscribing refreshes the token and clears any unsubscribe.
  const [row] = await db
    .insert(subscribers)
    .values({ email, token })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: { token, unsubscribedAt: null },
    })
    .returning();

  if (!row.confirmedAt) {
    await sendConfirmationEmail(email, row.token);
  }

  // Always the same response — no way to enumerate the subscriber list.
  return Response.json({ ok: true });
}
