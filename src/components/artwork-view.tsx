import Image from "next/image";
import Link from "next/link";
import type { PickWithArtwork } from "@/lib/queries";
import { formatDisplayDate, parisToday } from "@/lib/date";
import { SubscribeForm } from "./subscribe-form";

export function ArtworkView({ pick, artwork }: PickWithArtwork) {
  const isToday = pick.date === parisToday();
  return (
    <article className="mx-auto max-w-5xl px-6 sm:px-10">
      <p className="pt-6 text-center text-xs uppercase tracking-[0.22em] text-stone">
        {isToday ? "Aujourd'hui au musée" : "From the permanent collection"}
        {" · "}
        {formatDisplayDate(pick.date)}
      </p>

      <figure className="mt-8">
        <div className="relative mx-auto w-full">
          <Image
            src={artwork.imageUrl}
            alt={artwork.title}
            width={1600}
            height={1200}
            priority
            className="mx-auto max-h-[78vh] w-auto shadow-[0_20px_60px_-20px_rgba(28,26,23,0.45)]"
            sizes="(min-width: 1024px) 960px, 100vw"
          />
        </div>
        <figcaption className="mx-auto mt-10 max-w-xl text-center">
          <h1 className="font-display text-3xl italic leading-tight sm:text-4xl">
            {artwork.title}
          </h1>
          <p className="mt-3 text-sm text-umber">
            {artwork.artist ?? "Unknown artist"}
            {artwork.dateDisplay ? ` · ${artwork.dateDisplay}` : ""}
          </p>
          {artwork.medium && (
            <p className="mt-1 text-xs text-stone">{artwork.medium}</p>
          )}
        </figcaption>
      </figure>

      <div className="mx-auto mt-12 max-w-xl">
        <div className="mx-auto mb-10 h-px w-16 bg-hairline" />
        {pick.story.split(/\n{2,}/).map((paragraph, i) => (
          <p
            key={i}
            className="mb-6 font-display text-lg leading-relaxed text-ink sm:text-xl"
          >
            {paragraph}
          </p>
        ))}
        <p className="mt-10 border-l-2 border-hairline pl-4 text-xs leading-relaxed text-stone">
          <a
            href={artwork.sourceUrl}
            className="underline decoration-hairline underline-offset-2 hover:text-ink"
          >
            {artwork.museumName}
          </a>
          <br />
          {artwork.creditLine}
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-xl border-t border-hairline pt-10 text-center">
        <p className="font-display text-2xl italic">
          One masterpiece, every morning.
        </p>
        <p className="mt-2 text-sm text-umber">
          The daily edition, delivered before the museum opens.
        </p>
        <SubscribeForm />
        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-stone">
          <Link href="/collection" className="hover:text-ink">
            Visit the permanent collection →
          </Link>
        </p>
      </div>
    </article>
  );
}
