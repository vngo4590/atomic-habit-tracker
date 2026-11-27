import type { Metadata } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

// The single UI typeface (design-system/atomicly/MASTER.md). Exposed as the
// --font-jakarta CSS variable, which app/styles/tokens.css folds into
// --font-body with system fallbacks. `display: swap` shows fallback text
// immediately instead of hiding it while the web font downloads.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
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

  // Runs synchronously before the page paints so the saved theme and accent
  // hue are applied to <html> immediately — no flash of the default (light)
  // theme on reload. Mirrors lib/appearance.ts. A retired decorative theme
  // id still sitting in 'atomicly:theme-variant' wins and is mapped to its
  // nearest supported theme — keep this map in sync with LEGACY_THEME_MAP in
  // lib/themes.ts. suppressHydrationWarning silences the expected attribute
  // diff this introduces between server and client HTML.
  const noFlashScript = `(function(){try{var d=document.documentElement,ls=window.localStorage;` +
    `var m={light:'light',dark:'dark',glass:'light',fairy:'light',neon:'dark',stars:'dark'};` +
    `var t=m[ls.getItem('atomicly:theme-variant')]||m[ls.getItem('atomicly:theme')];` +
    `if(t==='light'||t==='dark')d.dataset.theme=t;` +
    `var a=parseInt(ls.getItem('atomicly:accent'),10);` +
    `if(!isNaN(a))d.style.setProperty('--accent-hue',String(a));}catch(e){}})();`;

  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        {children}
      </body>
    </html>
  );
}
