import type { MetadataRoute } from "next";
import { getCollection } from "@/lib/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const picks = await getCollection();
  const days = picks.map(({ pick }) => ({
    url: `https://musee.art/day/${pick.date}`,
    lastModified: new Date(`${pick.date}T00:00:00Z`),
  }));
  return [
    { url: "https://musee.art", changeFrequency: "daily" as const, priority: 1 },
    { url: "https://musee.art/collection", changeFrequency: "daily" as const },
    { url: "https://musee.art/about" },
    ...days,
  ];
}
