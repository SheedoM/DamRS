"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { registerStudentAction, checkUniversityIdAction, type StudentRegistrationActionResult } from "./actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const initialState: StudentRegistrationActionResult = { ok: true, message: "" };
const checkInitial = { ok: true, message: "" };

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(registerStudentAction, initialState);
  const [checkState, checkFormAction, isChecking] = useActionState(checkUniversityIdAction, checkInitial);
  const [autoLoginError, setAutoLoginError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!state.ok || !state.credentials) return;
    const credentials = state.credentials;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setAutoLoginError(null);
      setIsRedirecting(true);

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (cancelled) return;

      if (error) {
        setIsRedirecting(false);
        setAutoLoginError("تم إنشاء الحساب، لكن تعذّر تسجيل الدخول تلقائيًا. استخدم صفحة تسجيل الدخول.");
        return;
      }

      router.replace("/");
      router.refresh();
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router, state]);

  return (
    <AuthShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <div>
              <p className="text-sm font-medium text-[var(--brand-blue)]">تسجيل جديد</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">إنشاء حساب قائد فريق المشروع</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                بعد إنشاء الحساب، استخدم الرقم الجامعي وكلمة المرور الأولية هي الرقم القومي.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {state.message ? (
              state.ok ? (
                <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                  <div className="flex items-center gap-2">
                    {isRedirecting ? <Spinner /> : null}
                    <span>{state.message}</span>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <Alert>{state.message}</Alert>
                </div>
              )
            ) : null}
            {autoLoginError ? (
              <div className="mb-4">
                <Alert>{autoLoginError}</Alert>
              </div>
            ) : null}

            <form action={checkFormAction} className="mb-6 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">التحقق من الرقم الجامعي (للمشرف فقط)</p>
              <div className="flex gap-2">
                <Input name="student_id" inputMode="numeric" placeholder="أدخل الرقم الجامعي للتحقق" className="flex-1" />
                <button
                  type="submit"
                  disabled={isChecking}
                  className="rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isChecking ? "..." : "تحقق"}
                </button>
              </div>
              {checkState.message ? (
                <p className={`text-xs ${checkState.ok ? "text-emerald-700" : "text-red-600"}`}>
                  {checkState.message}
                </p>
              ) : null}
            </form>

            <form className="space-y-4" action={formAction}>
              <div className="space-y-2">
                <Label htmlFor="student_id">الرقم الجامعي</Label>
                <Input id="student_id" name="student_id" inputMode="numeric" autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="national_id">الرقم القومي</Label>
                <Input
                  id="national_id"
                  name="national_id"
                  type="password"
                  inputMode="numeric"
                  maxLength={14}
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending || isRedirecting}>
                {isPending ? "جارٍ إنشاء الحساب..." : isRedirecting ? "جارٍ تحويلك..." : "إنشاء الحساب"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="font-semibold text-[var(--brand-blue)] hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </CardContent>
        </Card>
    </AuthShell>
  );
}
