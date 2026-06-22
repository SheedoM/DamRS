"use client";

import { useActionState, useState } from "react";

import { saveStudentGradesAction } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { programLabel } from "@/lib/i18n/labels";
import type { ProjectStudentGrade } from "@/lib/admin/student-grades";
import {
  FIRST_SEMESTER_MAX,
  SUPERVISION_MAX,
  calcStudentFinal,
  termMax,
  type CycleTerm,
} from "@/lib/review/grading";

const initialState = { ok: true, message: "" };

export function StudentGradesForm({
  projectId,
  students,
  term,
  supervisorName,
}: {
  projectId: string;
  students: ProjectStudentGrade[];
  term: CycleTerm;
  supervisorName: string | null;
}) {
  const [state, formAction, isPending] = useActionState(saveStudentGradesAction, initialState);
  const isSecond = term === "second";
  const [entries, setEntries] = useState(
    () =>
      Object.fromEntries(
        students.map((student) => [
          student.teamMemberId,
          { first: student.firstSemester, supervision: student.supervision },
        ]),
      ) as Record<string, { first: number; supervision: number }>,
  );
  // Which rows the admin is currently overriding. Only edited rows are submitted,
  // so untouched supervisor entries keep their value and attribution.
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const anyEditing = Object.values(editing).some(Boolean);

  // Collapse all overrides once a save succeeds.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.ok && state.message) setEditing({});
  }

  const setField = (id: string, field: "first" | "supervision") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], [field]: isNaN(value) ? 0 : value } }));
  };

  // The coursework grade that the supervisor enters: أعمال السنة (30) in the
  // second term, أعمال الفصل (10) in the first.
  const gradeLabel = isSecond ? `أعمال السنة (${SUPERVISION_MAX})` : `أعمال الفصل (${FIRST_SEMESTER_MAX})`;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p>
          <span className="font-medium text-slate-900">{gradeLabel}</span> يُدخلها المشرف.{" "}
          {supervisorName ? (
            <>المشرف المسؤول: <span className="font-medium text-slate-900">{supervisorName}</span>.</>
          ) : (
            <span className="text-amber-700">لم يُعيَّن مشرف لهذا المشروع بعد.</span>
          )}
        </p>
        <p className="mt-1">القيمة الظاهرة هنا هي ما أدخله المشرف؛ استخدم «تعديل» للتجاوز الإداري عند الحاجة.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">الطالب</th>
              {isSecond ? <th className="px-3 py-2 font-semibold">المناقشة (60)</th> : null}
              {isSecond ? (
                <th className="px-3 py-2 font-semibold">أعمال السنة ({SUPERVISION_MAX})</th>
              ) : (
                <th className="px-3 py-2 font-semibold">أعمال الفصل ({FIRST_SEMESTER_MAX})</th>
              )}
              <th className="px-3 py-2 font-semibold">النهائي ({termMax(term)})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.map((student) => {
              const entry = entries[student.teamMemberId];
              const final = calcStudentFinal({
                term,
                firstSemester: entry.first,
                supervision: entry.supervision,
                discussionTotals: [student.discussionSum],
              });
              return (
                <tr key={student.teamMemberId}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-950">{student.fullName}</p>
                      {student.isLeader ? <Badge tone="info">قائد الفريق</Badge> : null}
                    </div>
                    <p className="text-xs text-slate-500">{student.studentId}</p>
                    {student.program ? (
                      <p className="text-xs text-slate-400">{programLabel(student.program)}</p>
                    ) : null}
                  </td>
                  {isSecond ? (
                    <td className="px-3 py-2 text-slate-700">
                      {student.discussionSum}
                      <span className="text-xs text-slate-400"> ({student.evaluatorsSubmitted} مقيّم)</span>
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    {editing[student.teamMemberId] ? (
                      <>
                        <input
                          name={`grades.${student.teamMemberId}.${isSecond ? "supervision_score" : "first_semester_score"}`}
                          type="number"
                          min="0"
                          max={String(isSecond ? SUPERVISION_MAX : FIRST_SEMESTER_MAX)}
                          step="0.5"
                          value={isSecond ? entry.supervision : entry.first}
                          onChange={setField(student.teamMemberId, isSecond ? "supervision" : "first")}
                          className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm"
                          autoFocus
                        />
                        {/* keep the unused term's value intact on save */}
                        <input
                          type="hidden"
                          name={`grades.${student.teamMemberId}.${isSecond ? "first_semester_score" : "supervision_score"}`}
                          value={isSecond ? entry.first : entry.supervision}
                        />
                        <span className="ms-1 text-[11px] text-amber-700">تجاوز إداري</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {student.hasGrade ? (
                          <span className="font-medium text-slate-900">{isSecond ? entry.supervision : entry.first}</span>
                        ) : (
                          <span className="text-xs text-amber-700">بانتظار إدخال المشرف</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditing((prev) => ({ ...prev, [student.teamMemberId]: true }))}
                          className="text-xs text-[var(--brand-blue)] hover:underline"
                        >
                          تعديل
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-950">{final}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {anyEditing ? (
        <Button type="submit" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </Button>
      ) : null}
    </form>
  );
}
