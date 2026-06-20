"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  children: ReactNode;
};

export function NavLink({ href, label, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[rgba(52,126,224,0.08)] text-[var(--brand-blue)] font-semibold"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
      {label}
    </Link>
  );
}
