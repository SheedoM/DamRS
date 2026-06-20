"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";
import { NavLink } from "./nav-link";
import { navigationByRole } from "./sidebar";

type MobileNavProps = {
  role: UserRole;
};

export function MobileNav({ role }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">Open main menu</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-white transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/fcai-logo.jpg"
              alt="FCAI Damietta logo"
              width={44}
              height={44}
              className="h-11 w-11 rounded-md object-cover"
              priority
            />
            <div>
              <p className="text-sm font-semibold text-slate-950">GP Review</p>
              <p className="text-xs text-slate-500">Damietta FCAI</p>
            </div>
          </div>
          <button
            type="button"
            className="-m-2.5 rounded-md p-2.5 text-slate-700"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">Close menu</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Mobile navigation" className="space-y-1 px-3 py-4" onClick={() => setIsOpen(false)}>
          {navigationByRole[role].map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </div>
    </div>
  );
}
