import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://saas-tau-teal.vercel.app"),
  title: {
    default: "Wisp — Invisible intelligence. Visible savings.",
    template: "%s · Wisp",
  },
  description: "Fleet-wide LLM context compression with honest, net-of-cache billing.",
  icons: {
    icon: "/brand/wisp-logo-mark.png",
    apple: "/brand/wisp-logo-mark.png",
  },
  openGraph: {
    type: "website",
    siteName: "Wisp",
    images: [{ url: "/brand/wisp-og.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text-primary antialiased">{children}</body>
    </html>
  );
}
