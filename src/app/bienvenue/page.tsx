import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bienvenue",
};

export default function BienvenuePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-stone">
        Subscription confirmed
      </p>
      <h1 className="mt-6 max-w-xl font-display text-4xl italic leading-tight sm:text-5xl">
        Bienvenue au musée.
      </h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-umber">
        Your first masterpiece arrives tomorrow morning. Until then, today's
        room is open.
      </p>
      <Link
        href="/"
        className="mt-8 bg-ink px-6 py-3 text-xs uppercase tracking-[0.12em] text-parchment"
      >
        Enter the museum
      </Link>
    </div>
  );
}
