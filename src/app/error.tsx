"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-4xl font-bold text-slate-950">حدث خطأ ما</h1>
      <p className="mt-4 text-lg text-slate-600">وقع خطأ غير متوقع.</p>
      <Button onClick={reset} className="mt-6">إعادة المحاولة</Button>
    </main>
  );
}
