import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { Providers } from "@/lib/query";

/*
 * The reference serves these families from Google Fonts, which serves modern
 * browsers the *unhinted* builds. `next/font/google` requests with a hardcoded
 * Chrome/104 user agent and receives the hinted builds instead, whose advances
 * round to whole pixels at small sizes and make headings wrap differently. We
 * vendor the exact latin-subset files the reference browser downloads and load
 * them through Next's font loader so rendering is byte-for-byte identical.
 */
const instrumentSerif = localFont({
  src: [
    { path: "../fonts/instrument-serif-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif-400-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-instrument-serif",
});

const newsreader = localFont({
  src: [
    { path: "../fonts/newsreader-300_500-normal.woff2", weight: "300 500", style: "normal" },
    { path: "../fonts/newsreader-300_500-italic.woff2", weight: "300 500", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-newsreader",
});

const dmMono = localFont({
  src: [
    { path: "../fonts/dm-mono-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/dm-mono-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Yomikaa",
  description: "A personal archive, written by hand and kept in one place.",
};

export const viewport: Viewport = {
  themeColor: "#eeebe3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${newsreader.variable} ${dmMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
