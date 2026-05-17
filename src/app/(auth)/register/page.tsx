import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your Quartiq account.",
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Premium Executive SaaS Outer Card - slightly wider for multi-column grids */}
      <div className="w-full bg-card/70 dark:bg-card/40 backdrop-blur-xl border border-border/60 dark:border-border/30 rounded-2xl shadow-xl p-8 sm:p-10 space-y-6 transition-all duration-300 hover:shadow-2xl">
        {/* Elegant Heading */}
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground">
            Start tracking goals that matter
          </p>
        </div>

        {/* Existing register form */}
        <RegisterForm />

        {/* Card Footer */}
        <div className="text-center pt-4 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={ROUTES.LOGIN}
              className="font-medium text-primary hover:text-primary/80 hover:underline transition-all"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
