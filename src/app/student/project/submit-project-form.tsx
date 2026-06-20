"use client";

import { useActionState } from "react";

import { submitProjectAction } from "./actions";
import { Alert } from "@/components/ui/alert";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

const initialState = { ok: true, message: "" };

export function SubmitProjectForm({ projectId }: { projectId: string }) {
  const [state, formAction, isPending] = useActionState(submitProjectAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <ConfirmSubmitButton
        title="تسليم المشروع؟"
        message="سيؤدي هذا إلى تسليم مشروعك بشكل نهائي. بعد التسليم ينتهي دورك ولا يمكنك التعديل."
        confirmLabel="تسليم المشروع"
        pending={isPending}
        pendingLabel="جارٍ التسليم..."
      >
        تسليم المشروع
      </ConfirmSubmitButton>
    </form>
  );
}
