import { generateText } from "ai";
import type { Artwork } from "@/db/schema";

export const STORY_MODEL = "anthropic/claude-sonnet-5";

export type Story = {
  story: string;
  teaser: string;
  status: "ai" | "fallback";
  model: string | null;
};

export async function generateStory(artwork: Artwork): Promise<Story> {
  try {
    const { text } = await generateText({
      model: STORY_MODEL,
      maxOutputTokens: 1200,
      prompt: [
        "You are the curator of Le Musée Quotidien (musee.art), a daily museum that presents one masterpiece per day.",
        "Write the wall text for today's work. Aim for 3 short paragraphs (roughly 180-260 words total):",
        "what the viewer is looking at and what makes it remarkable, the artist and the moment it was made, and one detail worth leaning in for.",
        "Warm, precise, unstuffy. No headings, no bullet points, no exclamation marks. Do not invent facts beyond common art-historical knowledge of this work; when uncertain, stay with what is visible.",
        "",
        "After the wall text, on a final line, write: TEASER: followed by one enticing sentence (max 140 characters) for the daily email subject.",
        "",
        `Title: ${artwork.title}`,
        `Artist: ${artwork.artist ?? "Unknown"}`,
        `Date: ${artwork.dateDisplay ?? "Unknown"}`,
        `Medium: ${artwork.medium ?? "Unknown"}`,
        `Collection: ${artwork.museumName} (${artwork.creditLine})`,
      ].join("\n"),
    });

    const match = text.match(/TEASER:\s*(.+)\s*$/);
    const story = match ? text.slice(0, match.index).trim() : text.trim();
    const teaser = (match?.[1].trim() ?? fallbackTeaser(artwork)).slice(0, 140);
    if (story.length < 100) throw new Error("story too short");
    return { story, teaser, status: "ai", model: STORY_MODEL };
  } catch {
    return fallbackStory(artwork);
  }
}

/** Templated from metadata so a day is never empty, even if generation fails. */
export function fallbackStory(artwork: Artwork): Story {
  const artist = artwork.artist ?? "an unknown artist";
  const parts = [
    `${artwork.title}, by ${artist}${artwork.dateDisplay ? `, ${artwork.dateDisplay}` : ""}.`,
    artwork.medium ? `${artwork.medium}.` : null,
    `From the collection of the ${artwork.museumName}. ${artwork.creditLine}.`,
  ].filter(Boolean);
  return {
    story: parts.join("\n\n"),
    teaser: fallbackTeaser(artwork),
    status: "fallback",
    model: null,
  };
}

function fallbackTeaser(artwork: Artwork): string {
  return `Today at the museum: “${artwork.title}”${artwork.artist ? ` — ${artwork.artist}` : ""}`.slice(0, 140);
}
