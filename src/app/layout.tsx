import type { Metadata, Viewport } from "next";
import { inter, geistMono } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "Quartiq — Goal Tracking Portal",
    template: "%s | Quartiq",
  },
  description:
    "Enterprise goal tracking and management portal. Set, track, and achieve goals at scale.",
  keywords: ["goal tracking", "OKR", "productivity", "enterprise"],
  authors: [{ name: "Quartiq Team" }],
  robots: {
    index: false, // Private app — don't index
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning className={cn("font-sans", geist.variable)} // Required by next-themes to avoid hydration mismatch
    >
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
