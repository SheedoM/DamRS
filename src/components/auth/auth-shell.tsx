import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Shared branded layout for the auth pages (student login, staff login,
 * student registration). The right column hosts the page-specific card.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-slate-50 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex flex-col justify-between bg-[var(--brand-navy)] px-6 py-8 text-white sm:px-10">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/damietta-university.jpg"
            alt="Damietta University logo"
            width={56}
            height={56}
            className="h-14 w-14 rounded-md bg-white object-cover"
            priority
          />
          <Image
            src="/brand/fcai-logo.jpg"
            alt="FCAI logo"
            width={56}
            height={56}
            className="h-14 w-14 rounded-md bg-white object-cover"
            priority
          />
        </div>
        <div className="my-16 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-yellow)]">
            جامعة دمياط - كلية الحاسبات والذكاء الاصطناعي
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
            نظام تقييم مشروعات التخرج
          </h1>
          <p className="mt-5 text-base leading-7 text-blue-50">
            منصّة آمنة لتسليم مشروعات التخرج وإسنادها وتقييمها.
          </p>
        </div>
        <p className="text-sm text-blue-100">تقييم مشروعات التخرج</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </section>
    </main>
  );
}
