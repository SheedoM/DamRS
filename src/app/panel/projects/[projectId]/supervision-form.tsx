"use client";

import { useActionState, useState } from "react";

import { saveSupervisionScoresAction } from "./review-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { programLabel } from "@/lib/i18n/labels";
import type { SupervisionEntry } from "@/lib/panel/queries";

type Student = {
  id: string;
  full_name: string;
  student_id: string;
  program?: string | null;
  isLeader?: boolean;
};

type SupervisionFormProps = {
  projectId: string;
  term: "first" | "second";
  students: Student[];
  existing: SupervisionEntry[];
  locked?: boolean;
  finalized?: boolean;
};

const initialState = { ok: true, message: "" };

export function SupervisionForm({ projectId, term, students, existing, locked = false, finalized = false }: SupervisionFormProps) {
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
      {finalized ? <Badge tone="success">تم الاعتماد</Badge> : null}

      <p className="text-sm text-slate-600">
        أدخل درجة <span className="font-medium">{label}</span> لكل طالب (من {max}).
      </p>

      <div className="space-y-3">
        {students.map((student) => (
          <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-950">{student.full_name}</p>
                {student.isLeader ? <Badge tone="info">قائد الفريق</Badge> : null}
              </div>
              <p className="text-sm text-slate-500">{student.student_id}</p>
              {student.program ? <p className="text-xs text-slate-400">{programLabel(student.program)}</p> : null}
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
                disabled={locked}
                className="h-10 w-24 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
          </div>
        ))}
      </div>

      {locked ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          باب التقييم مغلق حاليًا. لا يمكنك إدخال أو تعديل الدرجات حتى يفتحه المسؤول.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" name="intent" value="draft" variant="outline" disabled={isPending}>
            {isPending ? "جارٍ الحفظ..." : "حفظ كمسودة"}
          </Button>
          <ConfirmSubmitButton
            name="intent"
            value="finalize"
            pending={isPending}
            pendingLabel="جارٍ الاعتماد..."
            title="اعتماد درجات الإشراف"
            message="سيتم اعتماد درجاتك لهذا المشروع ويمكنك إعادة حفظها كمسودة لاحقًا ما دام باب التقييم مفتوحًا."
            confirmLabel="اعتماد الدرجات"
          >
            اعتماد الدرجات
          </ConfirmSubmitButton>
        </div>
      )}
    </form>
  );
}
