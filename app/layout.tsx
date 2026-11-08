import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steady — what your SIP is actually doing",
  description: "A plain-language explainer for people in their first year of a SIP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
