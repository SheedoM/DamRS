"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createStudentAccountAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

export function CreateStudentForm() {
  const [state, formAction, isPending] = useActionState(createStudentAccountAction, initialState);
  const [open, setOpen] = useState(false);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.ok && state.message) {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {state.message}
        </div>
      ) : null}

      {open ? (
        <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_id">الرقم الجامعي</Label>
              <Input id="student_id" name="student_id" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="national_id">الرقم القومي (يُستخدم كلمة مرور)</Label>
              <Input id="national_id" name="national_id" inputMode="numeric" maxLength={14} required />
              <p className="text-xs text-slate-500">سيتمكن الطالب من تسجيل الدخول باستخدام رقمه الجامعي والرقم القومي.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جارٍ الإنشاء..." : "إنشاء حساب طالب"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة حساب طالب
        </Button>
      )}
    </div>
  );
}
