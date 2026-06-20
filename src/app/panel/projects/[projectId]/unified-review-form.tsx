"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { saveDraftReviewAction, saveFinalReviewAction } from "./review-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ScoreInput } from "@/components/review/score-input";
import type { PanelReview } from "@/lib/panel/queries";
import { cn } from "@/lib/utils";

type UnifiedReviewFormProps = {
  projectId: string;
  existingReview: PanelReview | null;
};

const initialState = { ok: true, message: "" };

export function UnifiedReviewForm({ projectId, existingReview }: UnifiedReviewFormProps) {
  const router = useRouter();
  const [draftState, draftAction, draftPending] = useActionState(saveDraftReviewAction, initialState);
  const [finalState, finalAction, finalPending] = useActionState(saveFinalReviewAction, initialState);

  const draftFormRef = useRef<HTMLFormElement>(null);
  const finalFormRef = useRef<HTMLFormElement>(null);

  const [scores, setScores] = useState({
    documentation: existingReview?.documentation_score ?? 0,
    implementation: existingReview?.implementation_score ?? 0,
    code_quality: existingReview?.code_quality_score ?? 0,
    innovation: existingReview?.innovation_score ?? 0,
    presentation: existingReview?.presentation_score ?? 0,
    discussion: existingReview?.discussion_score ?? 0,
  });

  const draftTotal = scores.documentation + scores.implementation + scores.code_quality + scores.innovation;
  const finalTotal = scores.presentation + scores.discussion;
  const grandTotal = draftTotal + finalTotal;

  const isDraftSubmitted = !!existingReview?.draft_submitted_at;

  useEffect(() => {
    if (draftState.ok && draftState.message) {
      router.refresh();
    }
  }, [draftState, router]);

  useEffect(() => {
    if (finalState.ok && finalState.message) {
      router.refresh();
    }
  }, [finalState, router]);

  const handleScoreChange = (name: keyof typeof scores) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setScores((prev) => ({ ...prev, [name]: isNaN(val) ? 0 : val }));
  };

  return (
    <div className="space-y-10">
      {/* SECTION 1: Pre-Discussion (Draft Review) */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Section 1: Pre-Discussion</h2>
          <p className="text-sm text-slate-500">Review documentation and code before the final presentation.</p>
        </div>
        <form action={draftAction} ref={draftFormRef} className="space-y-5 rounded-lg border border-slate-200 p-5 bg-slate-50/50">
          <input type="hidden" name="project_id" value={projectId} />

          <div className="grid gap-4 md:grid-cols-2">
            <ScoreInput label="Documentation" name="documentation_score" max={20} defaultValue={scores.documentation} onChange={handleScoreChange("documentation")} />
            <ScoreInput label="Implementation" name="implementation_score" max={25} defaultValue={scores.implementation} onChange={handleScoreChange("implementation")} />
            <ScoreInput label="Code quality" name="code_quality_score" max={20} defaultValue={scores.code_quality} onChange={handleScoreChange("code_quality")} />
            <ScoreInput label="Innovation" name="innovation_score" max={15} defaultValue={scores.innovation} onChange={handleScoreChange("innovation")} />
          </div>

          <div className="flex justify-end">
            <p className="text-sm font-semibold text-[var(--brand-blue)]">Pre-Discussion Total: {draftTotal} / 80</p>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-700">Pre-Discussion Notes</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={existingReview?.draft_notes || ""}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-700">Questions for Discussion</span>
            <textarea
              name="questions"
              rows={3}
              defaultValue={existingReview?.draft_questions || ""}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
            />
          </label>

          {!draftState.ok ? <Alert>{draftState.message}</Alert> : null}
          {draftState.ok && draftState.message ? <p className="text-sm text-emerald-700">{draftState.message}</p> : null}

          <Button type="submit" disabled={draftPending}>
            {draftPending ? "Saving..." : isDraftSubmitted ? "Update Pre-Discussion Review" : "Save Pre-Discussion Review"}
          </Button>
        </form>
      </section>

      {/* SECTION 2: Post-Discussion (Final Review) */}
      <section className={cn(!isDraftSubmitted && "opacity-50 grayscale")}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Section 2: Post-Discussion</h2>
          <p className="text-sm text-slate-500">Grade presentation and discussion. Unlocks after pre-discussion is saved.</p>
        </div>
        <form action={finalAction} ref={finalFormRef} className="space-y-5 rounded-lg border border-slate-200 p-5 bg-slate-50/50">
          <input type="hidden" name="project_id" value={projectId} />
          
          {!isDraftSubmitted && (
            <Alert className="mb-4 text-slate-700">
              Complete the pre-discussion review above to unlock this section.
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <ScoreInput label="Presentation" name="presentation_score" max={10} defaultValue={scores.presentation} disabled={!isDraftSubmitted} onChange={handleScoreChange("presentation")} />
            <ScoreInput label="Discussion" name="discussion_score" max={10} defaultValue={scores.discussion} disabled={!isDraftSubmitted} onChange={handleScoreChange("discussion")} />
          </div>

          <div className="flex justify-end">
            <p className="text-sm font-semibold text-[var(--brand-blue)]">Post-Discussion Total: {finalTotal} / 20</p>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-700">Final Notes</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={existingReview?.final_notes || ""}
              disabled={!isDraftSubmitted}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20 disabled:opacity-50"
            />
          </label>

          {!finalState.ok ? <Alert>{finalState.message}</Alert> : null}
          {finalState.ok && finalState.message ? <p className="text-sm text-emerald-700">{finalState.message}</p> : null}

          <ConfirmSubmitButton
            title="Submit final review?"
            message="This will save your final presentation and discussion scores. You can still edit while assigned, but this action affects the official panel grade."
            confirmLabel={existingReview?.final_submitted_at ? "Update final review" : "Submit final review"}
            pending={finalPending}
            pendingLabel="Saving..."
            disabled={!isDraftSubmitted || finalPending}
          >
            {existingReview?.final_submitted_at ? "Update final review" : "Submit final review"}
          </ConfirmSubmitButton>
        </form>
      </section>

      <div className="flex justify-between items-center bg-[var(--brand-blue)] text-white p-4 rounded-lg shadow-sm">
        <span className="text-lg font-semibold">Grand Total Score</span>
        <span className="text-2xl font-bold">{grandTotal} / 100</span>
      </div>
    </div>
  );
}
