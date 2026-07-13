import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://musee.art"),
  title: {
    default: "Le Musée Quotidien — one masterpiece a day",
    template: "%s — Le Musée Quotidien",
  },
  description:
    "A daily museum. One public-domain masterpiece each day, with the story behind it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${geist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="flex items-baseline justify-between px-6 py-5 sm:px-10">
          <Link
            href="/"
            className="font-display text-xl tracking-wide text-ink"
          >
            musée<span className="text-stone">.art</span>
          </Link>
          <nav className="flex gap-6 text-xs uppercase tracking-[0.18em] text-umber">
            <Link href="/collection" className="hover:text-ink">
              La Collection
            </Link>
            <Link href="/about" className="hover:text-ink">
              About
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-hairline px-6 py-8 sm:px-10">
          <p className="text-xs leading-relaxed text-stone">
            Le Musée Quotidien — one masterpiece a day. All works are in the
            public domain, courtesy of the open-access programs of The
            Metropolitan Museum of Art, the Art Institute of Chicago, and the
            Cleveland Museum of Art.
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
