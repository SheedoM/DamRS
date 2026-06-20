"use client";

import { useActionState } from "react";

import { saveGradeOverrideAction } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import type { GradeOverride } from "@/lib/admin/queries";

const initialState = { ok: true, message: "" };

function ScoreInput({
  label,
  name,
  max,
  defaultValue,
}: {
  label: string;
  name: string;
  max: number;
  defaultValue: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type="number"
        min="0"
        max={String(max)}
        step="0.5"
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
      />
      <span className="text-xs text-slate-500">Max {max}</span>
    </label>
  );
}

export function GradeOverrideForm({
  projectId,
  activeOverride,
}: {
  projectId: string;
  activeOverride: GradeOverride | null;
}) {
  const [state, formAction, isPending] = useActionState(saveGradeOverrideAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dean Override</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ScoreInput label="Documentation" name="documentation_score" max={20} defaultValue={activeOverride?.documentation_score ?? 0} />
            <ScoreInput label="Implementation" name="implementation_score" max={25} defaultValue={activeOverride?.implementation_score ?? 0} />
            <ScoreInput label="Code quality" name="code_quality_score" max={20} defaultValue={activeOverride?.code_quality_score ?? 0} />
            <ScoreInput label="Innovation" name="innovation_score" max={15} defaultValue={activeOverride?.innovation_score ?? 0} />
            <ScoreInput label="Presentation" name="presentation_score" max={10} defaultValue={activeOverride?.presentation_score ?? 0} />
            <ScoreInput label="Discussion" name="discussion_score" max={10} defaultValue={activeOverride?.discussion_score ?? 0} />
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-700">Override reason</span>
            <textarea
              name="reason"
              rows={4}
              defaultValue=""
              placeholder={activeOverride ? `Current reason: ${activeOverride.reason}` : "Explain why the official grade is being overridden."}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
            />
          </label>

          {!state.ok ? <Alert>{state.message}</Alert> : null}
          {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

          <ConfirmSubmitButton
            title="Save dean override?"
            message="This will become the official project grade. Panel reviews and averages will remain visible for audit."
            confirmLabel={activeOverride ? "Replace override" : "Save override"}
            pending={isPending}
            pendingLabel="Saving..."
          >
            {activeOverride ? "Replace override" : "Save override"}
          </ConfirmSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

