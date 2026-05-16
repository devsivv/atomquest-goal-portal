import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your AtomQuest account.",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start tracking goals that matter
          </p>
        </div>

        <RegisterForm />

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={ROUTES.LOGIN}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
