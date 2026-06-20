"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerStudentAction } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerStudentAction, initialState);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div>
            <p className="text-sm font-medium text-[var(--brand-blue)]">تسجيل قائد فريق جديد</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">إنشاء حساب طالب</h2>
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
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_id">الرقم الجامعي</Label>
              <Input id="student_id" name="student_id" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="national_id">الرقم القومي</Label>
              <Input id="national_id" name="national_id" inputMode="numeric" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "جارٍ التسجيل..." : "تسجيل"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold text-[var(--brand-blue)]">
              تسجيل الدخول
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
