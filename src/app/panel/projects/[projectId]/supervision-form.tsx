"use client";

import { useActionState, useState } from "react";

import { saveSupervisionScoresAction } from "./review-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SupervisionEntry } from "@/lib/panel/queries";

type Student = {
  id: string;
  full_name: string;
  student_id: string;
};

type SupervisionFormProps = {
  projectId: string;
  term: "first" | "second";
  students: Student[];
  existing: SupervisionEntry[];
};

const initialState = { ok: true, message: "" };

export function SupervisionForm({ projectId, term, students, existing }: SupervisionFormProps) {
  const [state, formAction, isPending] = useActionState(saveSupervisionScoresAction, initialState);

  const max = term === "first" ? 10 : 30;
  const label = term === "first" ? "أعمال الفصل" : "أعمال السنة";

  const byMember = new Map(existing.map((e) => [e.team_member_id, e]));
  const initial: Record<string, number> = {};
  for (const student of students) {
    const e = byMember.get(student.id);
    initial[student.id] = e ? (term === "first" ? e.first_semester_score : e.supervision_score) : 0;
  }
  const [values, setValues] = useState<Record<string, number>>(initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

      <p className="text-sm text-slate-600">
        أدخل درجة <span className="font-medium">{label}</span> لكل طالب (من {max}).
      </p>

      <div className="space-y-3">
        {students.map((student) => (
          <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
            <div>
              <p className="font-medium text-slate-950">{student.full_name}</p>
              <p className="text-sm text-slate-500">{student.student_id}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">{label} / {max}</span>
              <input
                name={`supervision.${student.id}`}
                type="number"
                min="0"
                max={String(max)}
                step="0.5"
                value={values[student.id] ?? 0}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setValues((prev) => ({ ...prev, [student.id]: isNaN(v) ? 0 : v }));
                }}
                className="h-10 w-24 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
              />
            </label>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ الدرجات"}
      </Button>
    </form>
  );
}
