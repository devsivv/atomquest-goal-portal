import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Quartiq account.",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Premium Executive SaaS Outer Card */}
      <div className="w-full bg-card/70 dark:bg-card/40 backdrop-blur-xl border border-border/60 dark:border-border/30 rounded-2xl shadow-xl p-8 sm:p-10 space-y-6 transition-all duration-300 hover:shadow-2xl">
        {/* Elegant Heading */}
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Sign in to Quartiq
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and achieve your goals at scale
          </p>
        </div>

        {/* Existing login form */}
        <LoginForm />

        {/* Card Footer */}
        <div className="text-center pt-4 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={ROUTES.REGISTER}
              className="font-medium text-primary hover:text-primary/80 hover:underline transition-all"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
