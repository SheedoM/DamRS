"use client";

import { useActionState } from "react";

import { saveDraftReviewAction, saveFinalReviewAction } from "./review-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ScoreInput } from "@/components/review/score-input";
import type { PanelReview } from "@/lib/panel/queries";

type ReviewFormProps = {
  mode: "draft" | "final";
  projectId: string;
  existingReview: PanelReview | null;
};

const initialState = { ok: true, message: "" };

export function ReviewForm({ mode, projectId, existingReview }: ReviewFormProps) {
  const action = mode === "draft" ? saveDraftReviewAction : saveFinalReviewAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isDraft = mode === "draft";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isDraft ? "Draft review" : "Final review"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="project_id" value={projectId} />

          <div className="grid gap-4 md:grid-cols-2">
            {isDraft ? (
              <>
                <ScoreInput label="Documentation" name="documentation_score" max={20} defaultValue={existingReview?.documentation_score ?? 0} />
                <ScoreInput label="Implementation" name="implementation_score" max={25} defaultValue={existingReview?.implementation_score ?? 0} />
                <ScoreInput label="Code quality" name="code_quality_score" max={20} defaultValue={existingReview?.code_quality_score ?? 0} />
                <ScoreInput label="Innovation" name="innovation_score" max={15} defaultValue={existingReview?.innovation_score ?? 0} />
              </>
            ) : (
              <>
                <ScoreInput label="Presentation" name="presentation_score" max={10} defaultValue={existingReview?.presentation_score ?? 0} />
                <ScoreInput label="Discussion" name="discussion_score" max={10} defaultValue={existingReview?.discussion_score ?? 0} />
              </>
            )}
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea
              name="notes"
              rows={5}
              defaultValue={isDraft ? existingReview?.draft_notes || "" : existingReview?.final_notes || ""}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
            />
          </label>

          {isDraft ? (
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-slate-700">Questions</span>
              <textarea
                name="questions"
                rows={4}
                defaultValue={existingReview?.draft_questions || ""}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
              />
            </label>
          ) : null}

          {!state.ok ? <Alert>{state.message}</Alert> : null}

          {isDraft ? (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : existingReview?.draft_submitted_at ? "Update draft review" : "Submit draft review"}
            </Button>
          ) : (
            <ConfirmSubmitButton
              title="Submit final review?"
              message="This will save your final presentation and discussion scores. You can still edit while assigned, but this action affects the official panel grade."
              confirmLabel={existingReview?.final_submitted_at ? "Update final review" : "Submit final review"}
              pending={isPending}
              pendingLabel="Saving..."
            >
              {existingReview?.final_submitted_at ? "Update final review" : "Submit final review"}
            </ConfirmSubmitButton>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
