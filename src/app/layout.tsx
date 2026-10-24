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
          <footer className="foot">Base version · maps &copy; OpenStreetMap contributors</footer>
        </div>
      </body>
    </html>
  );
}
