"use client";

import { useActionState, useMemo, useState } from "react";

import { saveDiscussionScoresAction } from "./review-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { discussionCriteria, calcDiscussionTotal, DISCUSSION_MAX } from "@/lib/review/grading";
import type { OwnDiscussionScore } from "@/lib/panel/queries";

type Student = {
  id: string;
  full_name: string;
  student_id: string;
};

type DiscussionFormProps = {
  projectId: string;
  students: Student[];
  existingScores: OwnDiscussionScore[];
};

const initialState = { ok: true, message: "" };

type ScoreMap = Record<string, Record<string, number>>;

export function DiscussionForm({ projectId, students, existingScores }: DiscussionFormProps) {
  const [state, formAction, isPending] = useActionState(saveDiscussionScoresAction, initialState);

  const initialScores = useMemo<ScoreMap>(() => {
    const byMember = new Map(existingScores.map((score) => [score.team_member_id, score]));
    const map: ScoreMap = {};
    for (const student of students) {
      const existing = byMember.get(student.id);
      map[student.id] = Object.fromEntries(
        discussionCriteria.map((criterion) => [
          criterion.key,
          existing ? Number(existing[criterion.key]) : 0,
        ]),
      );
    }
    return map;
  }, [students, existingScores]);

  const [scores, setScores] = useState<ScoreMap>(initialScores);

  const handleChange = (memberId: string, key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setScores((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], [key]: isNaN(value) ? 0 : value },
    }));
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="project_id" value={projectId} />

      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

      {students.map((student) => {
        const total = calcDiscussionTotal(scores[student.id] || {});
        return (
          <div key={student.id} className="rounded-lg border border-slate-200 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-950">{student.full_name}</p>
                <p className="text-sm text-slate-500">{student.student_id}</p>
              </div>
              <p className="text-sm font-semibold text-[var(--brand-blue)]">
                المجموع: {total} / {DISCUSSION_MAX}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {discussionCriteria.map((criterion) => (
                <label key={criterion.key} className="space-y-2">
                  <span className="block text-sm font-medium text-slate-700">
                    {criterion.label} ({criterion.max})
                  </span>
                  <input
                    name={`scores.${student.id}.${criterion.key}`}
                    type="number"
                    min="0"
                    max={String(criterion.max)}
                    step="0.5"
                    value={scores[student.id]?.[criterion.key] ?? 0}
                    onChange={handleChange(student.id, criterion.key)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ التقييم"}
      </Button>
    </form>
  );
}
