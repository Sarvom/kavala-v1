import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kavala",
  description: "Your friendly neighbourhood, trying to do better, one small step at a time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Loaded at runtime so builds don't need network access. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bangers&display=swap" />
      </head>
      <body>
        <div className="shell">
          <header className="topbar">
            <a href="/" className="wordmark">Kavala</a>
            <nav aria-label="Main">
              <a href="/">App</a>
              <a href="/engine">Engine</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="foot">Your friendly neighbourhood · maps &copy; OpenStreetMap contributors</footer>
        </div>
      </body>
    </html>
  );
}
