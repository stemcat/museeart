import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Placeholder keeps module import (and pre-DB builds) from throwing;
// queries against it fail at call time, which readers handle fail-soft.
if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set — all queries will fail");
}
const sql = neon(
  process.env.DATABASE_URL ??
    "postgres://placeholder:placeholder@placeholder.invalid/placeholder",
);

export const db = drizzle(sql, { schema });
