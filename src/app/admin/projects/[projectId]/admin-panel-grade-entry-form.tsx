"use client";

import { useActionState, useState } from "react";

import { enterMissingPanelGradeAction } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ScoreInput } from "@/components/review/score-input";
import type { AdminReview } from "@/lib/admin/queries";

const initialState = { ok: true, message: "" };

export function AdminPanelGradeEntryForm({
  projectId,
  panelMemberId,
  panelMemberName,
  review,
}: {
  projectId: string;
  panelMemberId: string;
  panelMemberName: string;
  review: AdminReview | null;
}) {
  const [state, formAction, isPending] = useActionState(enterMissingPanelGradeAction, initialState);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3">
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen((value) => !value)}>
        {isOpen ? "Cancel entry" : "Enter missing grade"}
      </Button>

      {isOpen ? (
        <form action={formAction} className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="panel_member_id" value={panelMemberId} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ScoreInput label="Documentation" name="documentation_score" max={20} defaultValue={review?.documentation_score ?? 0} />
            <ScoreInput label="Implementation" name="implementation_score" max={25} defaultValue={review?.implementation_score ?? 0} />
            <ScoreInput label="Code quality" name="code_quality_score" max={20} defaultValue={review?.code_quality_score ?? 0} />
            <ScoreInput label="Innovation" name="innovation_score" max={15} defaultValue={review?.innovation_score ?? 0} />
            <ScoreInput label="Presentation" name="presentation_score" max={10} defaultValue={review?.presentation_score ?? 0} />
            <ScoreInput label="Discussion" name="discussion_score" max={10} defaultValue={review?.discussion_score ?? 0} />
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Reason</span>
            <textarea
              name="reason"
              rows={3}
              placeholder={`Explain why ${panelMemberName}'s grade is being entered by admin.`}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
            />
          </label>

          {!state.ok ? <Alert>{state.message}</Alert> : null}
          {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

          <ConfirmSubmitButton
            title="Enter missing panel grade?"
            message={`This will fill ${panelMemberName}'s panel slot and count toward the official project average. The entry will be marked as admin-entered.`}
            confirmLabel="Enter grade"
            pending={isPending}
            pendingLabel="Saving..."
          >
            Enter grade
          </ConfirmSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
