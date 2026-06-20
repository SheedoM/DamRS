"use client";

import { useActionState } from "react";

import { addEligibleStudentsAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

export function RosterForm() {
  const [state, formAction, isPending] = useActionState(addEligibleStudentsAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        state.ok ? (
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
        ) : (
          <Alert>{state.message}</Alert>
        )
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="university_ids">الأرقام الجامعية المعتمدة</Label>
        <textarea
          id="university_ids"
          name="university_ids"
          rows={5}
          placeholder="أدخل رقمًا جامعيًا في كل سطر"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
          required
        />
        <p className="text-xs text-slate-500">
          كل رقم جامعي يسمح لقائد فريق واحد بالتسجيل، ولا يمكن استخدامه أكثر من مرة.
        </p>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الإضافة..." : "إضافة إلى القائمة"}
      </Button>
    </form>
  );
}
