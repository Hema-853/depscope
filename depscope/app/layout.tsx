import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "DepScope — dependency & vulnerability exposure explorer",
  description:
    "Trace how a vulnerability propagates through your open-source dependency graph.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-base text-ink bg-grid bg-grid antialiased">
        <div className="min-h-screen bg-gradient-to-b from-base via-base to-[#0d1119]">
          <header className="border-b border-hairline">
            <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="w-2 h-2 rounded-full bg-signal group-hover:scale-125 transition-transform" />
                <span className="font-mono text-sm tracking-wide text-ink">
                  DepScope
                </span>
              </Link>
              <nav className="flex items-center gap-6 font-mono text-xs text-muted">
                <Link href="/" className="hover:text-ink transition-colors">
                  packages
                </Link>
                <a
                  href="#vulnerabilities"
                  className="hover:text-ink transition-colors"
                >
                  vulnerabilities
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <footer className="mx-auto max-w-6xl px-6 py-10 text-xs font-mono text-faint border-t border-hairline mt-16">
            DepScope · graph data served from CognoDB over Bolt
          </footer>
        </div>
      </body>
    </html>
  );
}
