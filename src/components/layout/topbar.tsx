import Link from "next/link";
import { LogOut } from "lucide-react";

import type { CurrentProfile } from "@/lib/auth/get-current-profile";
import type { UserRole } from "@/lib/auth/roles";
import { MobileNav } from "./mobile-nav";

type TopbarProps = {
  title: string;
  profile: CurrentProfile;
  role: UserRole;
};

export function Topbar({ title, profile, role }: TopbarProps) {
  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNav role={role} />
        <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-blue)]">
          Graduation Project Audit System
        </p>
        <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="hidden text-sm font-medium text-slate-900 sm:inline">{profile.full_name}</p>
          <p className="inline text-sm font-medium text-slate-900 sm:hidden">{profile.full_name.split(" ")[0]}</p>
          <p className="hidden text-xs text-slate-500 sm:block">{profile.email}</p>
        </div>
        <Link
          href="/logout"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
