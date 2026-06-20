"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function NavLink({ href, label, icon: Icon }: NavLinkProps) {
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
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
