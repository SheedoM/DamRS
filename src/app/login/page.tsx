"use client";

import Image from "next/image";
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
          : "Unable to sign in. Check the Supabase configuration.",
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
            Damietta University - FCAI
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
            Graduation Project Audit System
          </h1>
          <p className="mt-5 text-base leading-7 text-blue-50">
            Secure submission, assignment, and review foundation for graduation
            project discussions.
          </p>
        </div>
        <p className="text-sm text-blue-100">GP Review</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div>
              <p className="text-sm font-medium text-[var(--brand-blue)]">
                Sign in with Supabase Auth
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Access your dashboard
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error ? <Alert>{error}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
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
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
