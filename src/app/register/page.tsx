"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerStudentAction } from "./actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerStudentAction, initialState);

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
                  {state.message}{" "}
                  <Link href="/login" className="font-semibold underline">
                    تسجيل الدخول
                  </Link>
                </div>
              ) : (
                <div className="mb-4">
                  <Alert>{state.message}</Alert>
                </div>
              )
            ) : null}

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
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
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
