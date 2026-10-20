import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "apat — your recipe notebook",
  description: "An early recipe-review prototype. Real imports and accounts are not enabled.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
