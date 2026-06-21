"use client";

import { useActionState } from "react";
import Link from "next/link";

import { saveSubmissionWindowAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState = { ok: true, message: "" };

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type SubmissionWindowFormProps = {
  mode: "create" | "edit";
  windowData: {
    id: string;
    cycle_id: string;
    opens_at: string;
    closes_at: string;
    allow_late_submission: boolean;
    allow_edit_after_submit: boolean;
    discussion_cycles?: { id: string; name: string; is_active: boolean; term?: string } | null;
  } | null;
} ;

export function SubmissionWindowForm({ mode, windowData }: SubmissionWindowFormProps) {
  const [state, formAction, isPending] = useActionState(saveSubmissionWindowAction, initialState);
  const isCreateMode = mode === "create";

  const actionWrapper = (formData: FormData) => {
    const opensAt = formData.get("opens_at") as string;
    const closesAt = formData.get("closes_at") as string;
    
    // Parse the local datetime string into a proper Date object on the client (which knows the timezone),
    // then convert to ISO UTC string so the server doesn't misinterpret the local time.
    if (opensAt) formData.set("opens_at", new Date(opensAt).toISOString());
    if (closesAt) formData.set("closes_at", new Date(closesAt).toISOString());
    
    // Start transition to avoid React warnings with async actionWrapper
    import("react").then((React) => {
      React.startTransition(() => {
        formAction(formData);
      });
    });
  };

  return (
    <form action={actionWrapper} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <input type="hidden" name="cycle_id" value={isCreateMode ? "" : windowData?.cycle_id || ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cycle_name">اسم الدورة</Label>
          <Input id="cycle_name" name="cycle_name" defaultValue={isCreateMode ? "" : windowData?.discussion_cycles?.name || ""} placeholder="مشاريع التخرج 2025/2026" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year">العام الدراسي</Label>
          <Input id="academic_year" name="academic_year" defaultValue={isCreateMode ? "" : "2025/2026"} placeholder="2025/2026" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="department">القسم / الجهة</Label>
          <Input id="department" name="department" defaultValue="كلية الحاسبات والذكاء الاصطناعي بدمياط" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="term">الفصل الدراسي</Label>
          <select
            id="term"
            name="term"
            defaultValue={windowData?.discussion_cycles?.term || "second"}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
          >
            <option value="second">الفصل الدراسي الثاني (الدرجة من 90)</option>
            <option value="first">الفصل الدراسي الأول (الدرجة من 10)</option>
          </select>
          <p className="text-xs text-slate-500">
            الفصل الثاني: مناقشة (60) + أعمال السنة (30). الفصل الأول: أعمال الفصل (10) فقط.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opens_at">يفتح في</Label>
          <Input id="opens_at" name="opens_at" type="datetime-local" defaultValue={isCreateMode ? "" : toLocalDateTime(windowData?.opens_at)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closes_at">يغلق في</Label>
          <Input id="closes_at" name="closes_at" type="datetime-local" defaultValue={isCreateMode ? "" : toLocalDateTime(windowData?.closes_at)} required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="allow_late_submission" defaultChecked={!isCreateMode && (windowData?.allow_late_submission || false)} />
        السماح بالتسليم المتأخر
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="allow_edit_after_submit" defaultChecked={!isCreateMode && (windowData?.allow_edit_after_submit || false)} />
        السماح بالتعديل بعد التسليم
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : isCreateMode ? "إنشاء نافذة التسليم" : "حفظ التغييرات"}
        </Button>
        <Link href="/admin" className={cn(buttonVariants({ variant: "outline" }))}>
          إلغاء
        </Link>
      </div>
    </form>
  );
}
