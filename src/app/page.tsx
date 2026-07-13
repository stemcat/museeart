import { ArtworkView } from "@/components/artwork-view";
import { SubscribeForm } from "@/components/subscribe-form";
import { getCurrentPick } from "@/lib/queries";

export const revalidate = 3600;

export default async function HomePage() {
  const current = await getCurrentPick();

  if (!current) {
    // Pre-launch: the museum is being hung
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-stone">
          Le Musée Quotidien
        </p>
        <h1 className="mt-6 max-w-xl font-display text-4xl italic leading-tight sm:text-5xl">
          The museum opens soon.
        </h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-umber">
          One masterpiece a day — the work, its story, nothing else. We are
          hanging the first room now.
        </p>
        <SubscribeForm />
      </div>
    );
  }

  return <ArtworkView {...current} />;
}
