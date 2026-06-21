"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginMode = "staff" | "student";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("student");

  // Staff fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Student fields
  const [studentId, setStudentId] = useState("");
  const [nationalId, setNationalId] = useState("");
  // Shared
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      // For students, derive the internal email from the student ID.
      const loginEmail = mode === "student" ? `${studentId.trim()}@damrs.edu` : email.trim();
      const loginPassword = mode === "student" ? nationalId.trim() : password;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) {
        setError(
          mode === "student"
            ? "الرقم الجامعي أو الرقم القومي غير صحيح."
            : signInError.message,
        );
        setIsSubmitting(false);
        return;
      }

      // Keep the button in its loading state: the navigation + refresh below
      // triggers a server round-trip (middleware role check + redirect) that
      // can take a moment. Resetting isSubmitting here would make the form
      // look idle during that gap. We intentionally leave it true so the
      // spinner stays visible until the new page renders.
      router.replace("/");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذّر تسجيل الدخول. تحقق من إعدادات Supabase.",
      );
      setIsSubmitting(false);
    }
  }

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
            جامعة دمياط - كلية الحاسبات والمعلومات
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
            نظام مراجعة مشاريع التخرج
          </h1>
          <p className="mt-5 text-base leading-7 text-blue-50">
            منصّة آمنة لتسليم مشاريع التخرج وإسنادها ومراجعتها.
          </p>
        </div>
        <p className="text-sm text-blue-100">مراجعة مشاريع التخرج</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div>
              <p className="text-sm font-medium text-[var(--brand-blue)]">تسجيل الدخول</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">الدخول إلى لوحة التحكم</h2>
            </div>
            {/* Mode toggle */}
            <div className="mt-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => { setMode("student"); setError(null); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "student" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                طالب
              </button>
              <button
                type="button"
                onClick={() => { setMode("staff"); setError(null); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "staff" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                إداري / عضو لجنة
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error ? <Alert>{error}</Alert> : null}

              {mode === "student" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="student_id">الرقم الجامعي</Label>
                    <Input
                      id="student_id"
                      type="text"
                      inputMode="numeric"
                      autoComplete="username"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="national_id">الرقم القومي</Label>
                    <Input
                      id="national_id"
                      type="password"
                      inputMode="numeric"
                      autoComplete="current-password"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                      />
                    </svg>
                    جارٍ تسجيل الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>
              {mode === "student" ? (
                <p className="text-center text-sm text-slate-500">
                  ليس لديك حساب طالب؟{" "}
                  <Link href="/register" className="font-semibold text-[var(--brand-blue)] hover:underline">
                    إنشاء حساب
                  </Link>
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
