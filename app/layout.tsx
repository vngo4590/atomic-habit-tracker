import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
} from "next/font/google";

import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Atomic Habits",
  description: "Atomic habit tracker",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The security Proxy (proxy.ts) sets a fresh per-request CSP nonce on the
  // request headers. We read it here so the inline no-flash script below can
  // carry the matching nonce — otherwise our strict Content-Security-Policy
  // (script-src 'nonce-...' 'strict-dynamic') would block it. Reading headers()
  // opts this layout into dynamic rendering, which nonce-based CSP requires.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Runs synchronously before the page paints so the saved theme, variant, and
  // accent are applied to <html> immediately — no flash of the default (light)
  // theme on reload. Mirrors lib/appearance.ts; keep the variant allow-list in
  // sync with lib/themes.ts. suppressHydrationWarning silences the expected
  // attribute diff this introduces between server and client HTML.
  const noFlashScript = `(function(){try{var d=document.documentElement,ls=window.localStorage;` +
    `var t=ls.getItem('atomicly:theme');if(t==='light'||t==='dark')d.dataset.theme=t;` +
    `var v=ls.getItem('atomicly:theme-variant');` +
    `if(['light','dark','glass','neon','fairy','stars'].indexOf(v)>-1)d.dataset.themeVariant=v;` +
    `var a=parseInt(ls.getItem('atomicly:accent'),10);` +
    `if(!isNaN(a)){d.style.setProperty('--accent','oklch(62% 0.13 '+a+')');` +
    `d.style.setProperty('--accent-2','oklch(72% 0.10 '+a+')');}}catch(e){}})();`;

  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${interTight.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        {children}
      </body>
    </html>
  );
}
