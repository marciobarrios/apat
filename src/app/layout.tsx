import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistSerifRegular } from "geist/font/serif/regular";
import "@fontsource/caveat/latin-400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "apat — your recipe notebook",
  description: "A private notebook for recipes worth keeping. Write, collect, and cook.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistSerifRegular.variable}`}>
      <body>{children}</body>
    </html>
  );
}
