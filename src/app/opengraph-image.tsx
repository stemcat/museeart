import { ImageResponse } from "next/og";
import { getCurrentPick } from "@/lib/queries";

export const alt = "Le Musée Quotidien";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const current = await getCurrentPick();

  if (!current) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f7f4ee",
            color: "#1c1a17",
          }}
        >
          <div style={{ fontSize: 72, fontStyle: "italic" }}>musée.art</div>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#8a8172",
              marginTop: 24,
            }}
          >
            One masterpiece a day
          </div>
        </div>
      ),
      size,
    );
  }

  const { artwork } = current;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f4ee",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.imageSmallUrl}
          alt=""
          style={{ width: 630, height: 630, objectFit: "cover" }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 56,
            width: 570,
          }}
        >
          <div
            style={{
              fontSize: 20,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#8a8172",
            }}
          >
            Aujourd&apos;hui au musée
          </div>
          <div
            style={{
              fontSize: 52,
              fontStyle: "italic",
              color: "#1c1a17",
              marginTop: 24,
              lineHeight: 1.15,
            }}
          >
            {artwork.title.length > 60
              ? `${artwork.title.slice(0, 57)}…`
              : artwork.title}
          </div>
          <div style={{ fontSize: 26, color: "#57503f", marginTop: 20 }}>
            {artwork.artist ?? "Unknown artist"}
          </div>
          <div style={{ fontSize: 22, color: "#8a8172", marginTop: 40 }}>
            musee.art
          </div>
        </div>
      </div>
    ),
    size,
  );
}
