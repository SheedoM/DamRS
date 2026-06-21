"use client";

import { useActionState } from "react";

import { deleteAdminProjectAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

const initialState = { ok: true, message: "" };

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [state, formAction, isPending] = useActionState(deleteAdminProjectAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="project_id" value={projectId} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      <ConfirmSubmitButton
        title="حذف المشروع؟"
        message="سيؤدي هذا إلى حذف المشروع وكل بياناته نهائيًا: أعضاء الفريق، الملفات، إسنادات اللجنة، والدرجات. لا يمكن التراجع."
        confirmLabel="حذف نهائي"
        variant="outline"
        pending={isPending}
        pendingLabel="جارٍ الحذف..."
      >
        حذف المشروع
      </ConfirmSubmitButton>
    </form>
  );
}
