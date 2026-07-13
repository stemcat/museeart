import type { Metadata } from "next";
import { SubscribeForm } from "@/components/subscribe-form";

export const metadata: Metadata = {
  title: "About",
  description: "What Le Musée Quotidien is, and where the art comes from.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-xl px-6 pt-6 sm:px-10">
      <p className="text-center text-xs uppercase tracking-[0.22em] text-stone">
        About the museum
      </p>
      <h1 className="mt-6 text-center font-display text-3xl italic sm:text-4xl">
        A museum with one room, rehung every day.
      </h1>

      <div className="mt-12 space-y-6 font-display text-lg leading-relaxed sm:text-xl">
        <p>
          Le Musée Quotidien shows one masterpiece a day — the work, its story,
          and nothing else. No infinite scroll, no algorithm. A single quiet
          room that changes each morning at midnight, Paris time.
        </p>
        <p>
          Every artwork here is in the public domain, drawn from the
          open-access collections of The Metropolitan Museum of Art, the Art
          Institute of Chicago, and the Cleveland Museum of Art — programs that
          have set hundreds of thousands of images free for everyone.
        </p>
        <p>
          Each day the museum keeps its picture, and the archive grows into a
          permanent collection: one work for every day the doors have been
          open.
        </p>
      </div>

      <div className="mt-16 border-t border-hairline pt-10 text-center">
        <p className="font-display text-2xl italic">Visit by email.</p>
        <p className="mt-2 text-sm text-umber">
          The daily edition arrives before the museum opens.
        </p>
        <SubscribeForm />
      </div>
    </div>
  );
}
