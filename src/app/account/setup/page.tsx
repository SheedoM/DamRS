import Link from "next/link";

import { Alert } from "@/components/ui/alert";

export default function AccountSetupPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl space-y-4">
        <Alert>
          Your Supabase auth user exists, but no matching profile was found.
          Ask an administrator to create a row in `public.profiles` for your user id.
        </Alert>
        <Link
          href="/logout"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--brand-navy)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-navy-strong)]"
        >
          Return to login
        </Link>
      </div>
    </main>
  );
}
