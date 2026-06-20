"use client";

import { useActionState } from "react";

import { assignPanelMemberAction, revokeAssignmentAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import type { AdminProjectRow } from "@/lib/admin/admin-projects";
import type { Assignment, PanelMember } from "@/lib/admin/queries";
import { useAutoClearMessage } from "@/hooks/use-auto-clear-message";

const initialState = { ok: true, message: "" };

export function AssignPanelMemberForm({
  projects,
  panelMembers,
  projectId,
}: {
  projects: AdminProjectRow[];
  panelMembers: PanelMember[];
  projectId?: string;
}) {
  const [state, formAction, isPending] = useActionState(assignPanelMemberAction, initialState);
  const showSuccess = useAutoClearMessage(state.ok ? state.message : "");

  // On a specific project's page the project is fixed; only the member is chosen.
  const lockedToProject = Boolean(projectId);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {showSuccess ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <div className={lockedToProject ? "" : "grid gap-4 md:grid-cols-2"}>
        {lockedToProject ? (
          <input type="hidden" name="project_id" value={projectId} />
        ) : (
          <select
            name="project_id"
            defaultValue=""
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            required
          >
            <option value="">اختر المشروع</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.title}</option>
            ))}
          </select>
        )}
        <select
          name="panel_member_id"
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          required
        >
          <option value="">اختر عضو اللجنة</option>
          {panelMembers.map((member) => (
            <option key={member.id} value={member.id}>{member.full_name}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الإسناد..." : "إسناد عضو لجنة"}
      </Button>
    </form>
  );
}

export function RevokeAssignmentForm({ assignment }: { assignment: Assignment }) {
  const [state, formAction, isPending] = useActionState(revokeAssignmentAction, initialState);

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="assignment_id" value={assignment.id} />
      <input type="hidden" name="project_id" value={assignment.project_id} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {assignment.is_active ? (
        <ConfirmSubmitButton
          title="إلغاء وصول عضو اللجنة؟"
          message={`سيؤدي هذا إلى إزالة وصول ${assignment.panel_member_name} لهذا المشروع فورًا.`}
          confirmLabel="إلغاء الوصول"
          variant="outline"
          size="sm"
          pending={isPending}
          pendingLabel="جارٍ الإلغاء..."
        >
          إلغاء
        </ConfirmSubmitButton>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled>
          ملغى
        </Button>
      )}
    </form>
  );
}
