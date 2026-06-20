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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذّر تسجيل الدخول. تحقق من إعدادات Supabase.",
      );
    } finally {
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
              <p className="text-sm font-medium text-[var(--brand-blue)]">
                تسجيل الدخول
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                الدخول إلى لوحة التحكم
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error ? <Alert>{error}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              طالب جديد؟{" "}
              <Link href="/register" className="font-semibold text-[var(--brand-blue)]">
                إنشاء حساب
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
