import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NETCINEMA — Auto-Synced Movie Dashboard",
  description:
    "NETCINEMA auto-updates its home dashboard with the latest theatrical and OTT releases using real-time TMDB metadata sync. Instant elastic search navigation.",
  keywords: ["movies", "streaming", "latest releases", "OTT", "cinema", "TMDB"],
  openGraph: {
    title: "NETCINEMA — Auto-Synced Movie Dashboard",
    description: "Latest theatrical and OTT releases with real-time sync and instant search.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#08090C] text-white min-h-screen">{children}</body>
    </html>
  );
}
