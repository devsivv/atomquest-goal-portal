import { ReactNode } from "react";
import Link from "next/link";
import { Atom } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors duration-300">
      {/* Background Gradients & Grid Pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40 dark:opacity-60">
        {/* Subtle grid pattern using system borders */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.91_0_0/0.1)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.91_0_0/0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,oklch(0.25_0_0/0.25)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.25_0_0/0.25)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        {/* Soft glowing mesh gradients that transition seamlessly */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10 transition-colors duration-300" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10 transition-colors duration-300" />
      </div>

      {/* Top Header Row */}
      <header className="w-full flex items-center justify-between p-6 md:p-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-primary transition-colors hover:text-primary/80">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Atom className="h-5 w-5 animate-pulse" style={{ animationDuration: "3s" }} />
          </div>
          <span className="text-xl font-semibold">Quartiq</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start pt-4 pb-12 px-4 sm:px-6 md:justify-center md:pt-0 md:pb-24">
        {children}
      </main>

      {/* Elegant Footer */}
      <footer className="w-full py-6 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/5">
        <p>© {new Date().getFullYear()} Quartiq. All rights reserved.</p>
      </footer>
    </div>
  );
}
