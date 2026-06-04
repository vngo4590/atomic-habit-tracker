import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        {children}
      </body>
    </html>
  );
}
