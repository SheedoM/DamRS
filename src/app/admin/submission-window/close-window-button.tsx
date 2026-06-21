"use client";

import { useActionState } from "react";

import { closeSubmissionWindowNowAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

const initialState = { ok: true, message: "" };

export function CloseSubmissionWindowButton() {
  const [state, formAction, isPending] = useActionState(closeSubmissionWindowNowAction, initialState);

  return (
    <div className="space-y-3">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
      ) : null}
      <form action={formAction}>
        <ConfirmSubmitButton
          variant="outline"
          pending={isPending}
          pendingLabel="جارٍ الإغلاق..."
          title="إغلاق نافذة التسليم"
          message="سيتم إنهاء فترة التسليم فورًا ومنع الطلاب من تسليم أو تعديل مشاريعهم. هل تريد المتابعة؟"
          confirmLabel="إغلاق الآن"
        >
          إغلاق الآن
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
