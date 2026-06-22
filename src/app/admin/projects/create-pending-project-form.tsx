"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";

import { createPendingProjectAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PanelMember } from "@/lib/admin/queries";

type AssignmentRow = { panel_member_id: string; role: "committee" | "supervisor" };

const initialState = { ok: true, message: "" };

const selectCls =
  "h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950";

export function CreatePendingProjectForm({ panelMembers }: { panelMembers: PanelMember[] }) {
  const [state, formAction, isPending] = useActionState(createPendingProjectAction, initialState);
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.ok && state.message) {
      setOpen(false);
      setAssignments([]);
    }
  }

  const addRow = () =>
    setAssignments((prev) => [...prev, { panel_member_id: "", role: "committee" }]);

  const removeRow = (i: number) =>
    setAssignments((prev) => prev.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof AssignmentRow, value: string) =>
    setAssignments((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)),
    );

  const validAssignments = assignments.filter((a) => a.panel_member_id);

  return (
    <div className="space-y-3">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {state.message}
        </div>
      ) : null}

      {open ? (
        <form
          action={formAction}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="assignments" value={JSON.stringify(validAssignments)} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leader_university_id">
                الرقم الجامعي لقائد الفريق <span className="text-red-500">*</span>
              </Label>
              <Input id="leader_university_id" name="leader_university_id" inputMode="numeric" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_number">رقم المشروع (اختياري)</Label>
              <Input id="project_number" name="project_number" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">عنوان المشروع (اختياري)</Label>
              <Input id="title" name="title" />
            </div>
          </div>

          {panelMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>الإسناد (اختياري)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-3 w-3" />
                  إضافة
                </Button>
              </div>
              {assignments.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.panel_member_id}
                    onChange={(e) => updateRow(i, "panel_member_id", e.target.value)}
                    className={`${selectCls} flex-1`}
                  >
                    <option value="">اختر العضو</option>
                    {panelMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                  <select
                    value={row.role}
                    onChange={(e) => updateRow(i, "role", e.target.value as AssignmentRow["role"])}
                    className={`${selectCls} w-32`}
                  >
                    <option value="committee">مناقش</option>
                    <option value="supervisor">مشرف</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جارٍ الإنشاء..." : "إنشاء المشروع"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOpen(false); setAssignments([]); }}
            >
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
