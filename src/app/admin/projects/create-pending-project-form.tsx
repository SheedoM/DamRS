"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createPendingProjectAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };


export function CreatePendingProjectForm() {
  const [state, formAction, isPending] = useActionState(createPendingProjectAction, initialState);
  const [open, setOpen] = useState(false);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.ok && state.message) {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-3">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {state.message}
        </div>
      ) : null}

      {open ? (
        <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            أدخل رقم المشروع وبيانات قائد الفريق. سيتمكن القائد من تسجيل الدخول برقمه الجامعي والرقم القومي ثم استكمال بيانات المشروع ورفع الملفات.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project_number">رقم المشروع</Label>
              <Input id="project_number" name="project_number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leader_university_id">الرقم الجامعي لقائد الفريق</Label>
              <Input id="leader_university_id" name="leader_university_id" inputMode="numeric" required />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جارٍ الإنشاء..." : "إنشاء المشروع"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          إنشاء مشروع جديد
        </Button>
      )}
    </div>
  );
}
