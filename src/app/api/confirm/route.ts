import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (token) {
    await db
      .update(subscribers)
      .set({ confirmedAt: new Date() })
      .where(and(eq(subscribers.token, token), isNull(subscribers.confirmedAt)));
  }
  redirect("/bienvenue");
}
