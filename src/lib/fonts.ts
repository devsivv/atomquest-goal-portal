/**
 * @file fonts.ts
 * @description next/font definitions — imported once, referenced everywhere.
 * Keeps font loading out of layout and avoids duplicate font requests.
 */

import { Inter, Geist_Mono } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
