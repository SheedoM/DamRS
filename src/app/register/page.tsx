"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";

import { registerStudentAction } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { programOptions } from "@/lib/i18n/labels";

const initialState = { ok: true, message: "" };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerStudentAction, initialState);

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
            إنشاء حساب طالب
          </h1>
          <p className="mt-5 text-base leading-7 text-blue-50">
            سجّل قائد الفريق باستخدام بياناته الجامعية المعتمدة لبدء تسليم مشروع التخرج.
          </p>
        </div>
        <p className="text-sm text-blue-100">نظام مراجعة مشاريع التخرج</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div>
              <p className="text-sm font-medium text-[var(--brand-blue)]">تسجيل طالب جديد</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">إنشاء حساب قائد فريق</h2>
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
                <Label htmlFor="full_name">الاسم الكامل</Label>
                <Input id="full_name" name="full_name" autoComplete="name" required />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="program">البرنامج</Label>
                <select
                  id="program"
                  name="program"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>اختر البرنامج</option>
                  {programOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
      </section>
    </main>
  );
}
