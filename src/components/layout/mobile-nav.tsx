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
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
      >
        <span className="sr-only">فتح القائمة الرئيسية</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer — kept mounted for the slide animation, but made inert when
          closed so it never intercepts taps or extends the page width. */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الرئيسية"
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 max-w-[85%] transform bg-white shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/fcai-logo.jpg"
              alt="شعار كلية الحاسبات والذكاء الاصطناعي بدمياط"
              width={44}
              height={44}
              className="h-11 w-11 rounded-md object-cover"
              priority
            />
            <div className="flex flex-col justify-center text-start">
              <p className="text-sm font-bold leading-tight text-blue-900">نظام تقييم مشروعات التخرج</p>
              <p className="text-[11px] font-medium text-slate-600">كلية الحاسبات والذكاء الاصطناعي</p>
            </div>
          </div>
          <button
            type="button"
            className="-m-2.5 rounded-md p-2.5 text-slate-700"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">إغلاق القائمة</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="التنقل في الجوال" className="space-y-1 px-3 py-4" onClick={() => setIsOpen(false)}>
          {navigationByRole[role].map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
