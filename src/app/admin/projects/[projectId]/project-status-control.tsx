"use client";

import { useActionState } from "react";

import { adminSetProjectStatusAction } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

const initialState = { ok: true, message: "" };

export function ProjectStatusControl({
  projectId,
  status,
  isComplete,
}: {
  projectId: string;
  status: string;
  isComplete: boolean;
}) {
  const [state, formAction, isPending] = useActionState(adminSetProjectStatusAction, initialState);

  const messages = (
    <>
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
    </>
  );

  if (status === "draft") {
    return (
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="target" value="submitted" />
        {messages}
        {isComplete ? (
          <ConfirmSubmitButton
            title="تعليم المشروع كمُسلَّم؟"
            message="سيُعتبر المشروع مُسلَّمًا ولن يتمكن الطالب من تعديله. يمكنك إعادته إلى مسودة لاحقًا إذا لزم الأمر."
            confirmLabel="تعليم كمُسلَّم"
            pending={isPending}
            pendingLabel="جارٍ الحفظ..."
          >
            تعليم المشروع كمُسلَّم
          </ConfirmSubmitButton>
        ) : (
          <>
            <Button type="button" variant="outline" disabled>
              تعليم كمُسلَّم
            </Button>
            <p className="text-xs text-amber-700">أكمل العناصر الناقصة أعلاه أولًا.</p>
          </>
        )}
      </form>
    );
  }

  if (status === "submitted") {
    return (
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="target" value="draft" />
        {messages}
        <ConfirmSubmitButton
          title="إعادة المشروع إلى مسودة؟"
          message="سيتمكن الطالب من تعديل المشروع مجددًا، وسيُلغى تاريخ التسليم حتى يُعاد تسليمه."
          confirmLabel="إعادة إلى مسودة"
          variant="outline"
          pending={isPending}
          pendingLabel="جارٍ..."
        >
          إعادة إلى مسودة
        </ConfirmSubmitButton>
      </form>
    );
  }

  // assigned / reviewed / completed: status is driven by the later workflow.
  return (
    <p className="text-sm text-slate-500">
      حالة المشروع «{status}» تُدار ضمن سير عمل التقييم.
    </p>
  );
}
