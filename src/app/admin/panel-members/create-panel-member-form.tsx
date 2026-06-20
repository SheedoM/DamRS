"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createPanelMemberAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { panelMemberTypeOptions } from "@/lib/i18n/labels";

const initialState = { ok: true, message: "" };

const selectClassName =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2";

export function CreatePanelMemberForm() {
  const [state, formAction, isPending] = useActionState(createPanelMemberAction, initialState);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.ok && state.message) {
      const match = state.message.match(/كلمة المرور المؤقتة:\s*(\S+)/);
      if (match) {
        setCreatedPassword(match[1]);
        setOpen(false);
      }
    }
  }

  return (
    <div className="space-y-4">
      {!state.ok ? <Alert>{state.message}</Alert> : null}

      {createdPassword ? (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-5">
          <h3 className="font-semibold text-slate-950">تم إنشاء عضو اللجنة</h3>
          <p className="mt-2 text-sm text-slate-700">
            احفظ كلمة المرور المؤقتة الآن — لا يمكن استرجاعها لاحقًا.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="rounded bg-white px-3 py-2 font-mono text-sm border border-slate-200">{createdPassword}</code>
            <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(createdPassword)}>
              نسخ
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setCreatedPassword(null)}>
            تم
          </Button>
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
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panel_member_type">نوع العضو</Label>
              <select id="panel_member_type" name="panel_member_type" className={selectClassName} required defaultValue="">
                <option value="" disabled>
                  اختر النوع
                </option>
                {panelMemberTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">القسم / الجهة</Label>
              <Input id="department" name="department" defaultValue="كلية الحاسبات والمعلومات بدمياط" required />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جارٍ الإنشاء..." : "إنشاء عضو لجنة"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة عضو لجنة
        </Button>
      )}
    </div>
  );
}
