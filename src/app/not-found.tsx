/**
 * @file app/not-found.tsx
 * @description 404 page — rendered for any unmatched route.
 */

import Link from "next/link";
import { ROUTES } from "@/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <p className="text-8xl font-black text-primary/20">404</p>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href={ROUTES.HOME}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
      >
        Back to Home
      </Link>
    </div>
  );
}
