import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pink Foundry Radar — Competitive ad intelligence",
  description:
    "AI-driven competitor ad analysis. Discover competitors, scrape their live ads, and get connected, action-ready insights.",
  icons: { icon: "/assets/wordmark-dark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
