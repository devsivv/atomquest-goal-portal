import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your AtomQuest account.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Sign in to AtomQuest
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track and achieve your goals at scale
          </p>
        </div>

        <LoginForm />

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={ROUTES.REGISTER}
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
