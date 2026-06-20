import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-6xl font-bold text-slate-950">404</h1>
      <p className="mt-4 text-lg text-slate-600">Page not found.</p>
      <Link href="/" className={cn(buttonVariants(), "mt-6")}>
        Return to dashboard
      </Link>
    </main>
  );
}
