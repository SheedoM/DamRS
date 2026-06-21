"use client";

import { useActionState, useState } from "react";

import { saveStudentGradesAction } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
}: {
  projectId: string;
  students: ProjectStudentGrade[];
  term: CycleTerm;
}) {
  const [state, formAction, isPending] = useActionState(saveStudentGradesAction, initialState);
  const [entries, setEntries] = useState(
    () =>
      Object.fromEntries(
        students.map((student) => [
          student.teamMemberId,
          { first: student.firstSemester, supervision: student.supervision },
        ]),
      ) as Record<string, { first: number; supervision: number }>,
  );

  const setField = (id: string, field: "first" | "supervision") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], [field]: isNaN(value) ? 0 : value } }));
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">الطالب</th>
              <th className="px-3 py-2 font-semibold">المناقشة (60)</th>
              <th className="px-3 py-2 font-semibold">الفصل الأول ({FIRST_SEMESTER_MAX})</th>
              <th className="px-3 py-2 font-semibold">الإشراف ({SUPERVISION_MAX})</th>
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
                    <p className="font-medium text-slate-950">{student.fullName}</p>
                    <p className="text-xs text-slate-500">{student.studentId}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {student.discussionSum}
                    <span className="text-xs text-slate-400"> ({student.evaluatorsSubmitted} مقيّم)</span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      name={`grades.${student.teamMemberId}.first_semester_score`}
                      type="number"
                      min="0"
                      max={String(FIRST_SEMESTER_MAX)}
                      step="0.5"
                      value={entry.first}
                      onChange={setField(student.teamMemberId, "first")}
                      className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      name={`grades.${student.teamMemberId}.supervision_score`}
                      type="number"
                      min="0"
                      max={String(SUPERVISION_MAX)}
                      step="0.5"
                      value={entry.supervision}
                      onChange={setField(student.teamMemberId, "supervision")}
                      className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-950">{final}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ درجات الطلاب"}
      </Button>
    </form>
  );
}
