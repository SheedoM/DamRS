"use client";

import { useActionState, useState } from "react";

import { overrideDiscussionScoresAction } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { discussionCriteria, DISCUSSION_MAX } from "@/lib/review/grading";
import type { StudentBreakdown } from "@/lib/admin/student-grades";

const initialState = { ok: true, message: "" };

type CellMap = Record<string, Record<string, number>>; // `${pm}|${tm}` -> criterion -> value

export function GradingBreakdown({
  projectId,
  students,
}: {
  projectId: string;
  students: StudentBreakdown[];
}) {
  const [state, formAction, isPending] = useActionState(overrideDiscussionScoresAction, initialState);

  const [cells, setCells] = useState<CellMap>(() => {
    const map: CellMap = {};
    for (const student of students) {
      for (const ev of student.evaluators) {
        map[`${ev.panelMemberId}|${student.teamMemberId}`] = Object.fromEntries(
          discussionCriteria.map((c) => [c.key, Number(ev[c.key])]),
        );
      }
    }
    return map;
  });

  const total = (key: string) =>
    discussionCriteria.reduce((sum, c) => sum + Number(cells[key]?.[c.key] ?? 0), 0);

  const hasEvaluators = students.some((s) => s.evaluators.length > 0);
  if (!hasEvaluators) {
    return <p className="text-sm text-slate-500">لا يوجد أعضاء لجنة مُسندون لهذا المشروع بعد.</p>;
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="project_id" value={projectId} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

      <p className="text-sm text-slate-500">
        درجات كل عضو لجنة لكل طالب. يمكنك تعديل أي قيمة كتجاوز إداري (override).
      </p>

      {students.map((student) => (
        <div key={student.teamMemberId} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-950">{student.fullName}</p>
            {student.isLeader ? <Badge tone="info">قائد الفريق</Badge> : null}
          </div>
          <p className="mb-3 text-xs text-slate-500">{student.studentId}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-2 font-semibold">عضو اللجنة</th>
                  {discussionCriteria.map((c) => (
                    <th key={c.key} className="px-2 py-2 font-semibold">{c.label} ({c.max})</th>
                  ))}
                  <th className="px-2 py-2 font-semibold">/ {DISCUSSION_MAX}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {student.evaluators.map((ev) => {
                  const key = `${ev.panelMemberId}|${student.teamMemberId}`;
                  return (
                    <tr key={key}>
                      <td className="px-2 py-2">
                        <span className="font-medium text-slate-900">{ev.name}</span>
                        {!ev.hasScore ? <span className="block text-xs text-amber-600">لم يُدخل</span> : null}
                      </td>
                      {discussionCriteria.map((c) => (
                        <td key={c.key} className="px-2 py-2">
                          <input
                            name={`override.${ev.panelMemberId}.${student.teamMemberId}.${c.key}`}
                            type="number"
                            min="0"
                            max={String(c.max)}
                            step="0.5"
                            value={cells[key]?.[c.key] ?? 0}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setCells((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], [c.key]: isNaN(v) ? 0 : v },
                              }));
                            }}
                            className="h-9 w-20 rounded-md border border-slate-300 px-2 text-sm"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 font-semibold text-slate-950">{total(key).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ درجات المناقشة"}
      </Button>
    </form>
  );
}
