import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatDisplayDate } from "@/lib/date";
import { getCollection } from "@/lib/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "La Collection Permanente",
  description: "Every masterpiece the museum has shown, one per day.",
};

export default async function CollectionPage() {
  const picks = await getCollection();

  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-10">
      <header className="pt-6 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-stone">
          La Collection Permanente
        </p>
        <h1 className="mt-4 font-display text-3xl italic sm:text-4xl">
          Every day the museum keeps its picture.
        </h1>
      </header>

      {picks.length === 0 ? (
        <p className="mt-16 text-center text-sm text-umber">
          The first room is still being hung.
        </p>
      ) : (
        <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {picks.map(({ pick, artwork }) => (
            <li key={pick.date}>
              <Link href={`/day/${pick.date}`} className="group block">
                <div className="relative aspect-4/5 overflow-hidden bg-hairline/40">
                  <Image
                    src={artwork.imageSmallUrl}
                    alt={artwork.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  />
                </div>
                <p className="mt-3 line-clamp-1 font-display text-base italic">
                  {artwork.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-umber">
                  {artwork.artist ?? "Unknown artist"}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-stone">
                  {formatDisplayDate(pick.date)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
