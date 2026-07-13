import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkView } from "@/components/artwork-view";
import { isValidDateParam } from "@/lib/date";
import { getCollection, getPickByDate } from "@/lib/queries";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const picks = await getCollection();
  return picks.map(({ pick }) => ({ date: pick.date }));
}

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!isValidDateParam(date)) return {};
  const result = await getPickByDate(date);
  if (!result) return {};
  return {
    title: `${result.artwork.title} — ${result.artwork.artist ?? "Unknown artist"}`,
    description: result.pick.teaser,
  };
}

export default async function DayPage({ params }: Props) {
  const { date } = await params;
  if (!isValidDateParam(date)) notFound();
  const result = await getPickByDate(date);
  if (!result) notFound();
  return <ArtworkView {...result} />;
}
