import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

async function unsubscribe(token: string | null) {
  if (token) {
    await db
      .update(subscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(subscribers.token, token));
  }
}

export async function GET(request: Request) {
  await unsubscribe(new URL(request.url).searchParams.get("token"));
  return new Response(
    "You have been unsubscribed from Le Musée Quotidien. The museum door is always open: https://musee.art",
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post)
export async function POST(request: Request) {
  await unsubscribe(new URL(request.url).searchParams.get("token"));
  return new Response("OK");
}
