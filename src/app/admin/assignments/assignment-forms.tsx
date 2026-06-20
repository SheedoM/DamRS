"use client";

import { useActionState } from "react";

import { assignPanelMemberAction, revokeAssignmentAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import type { AdminProjectRow } from "@/lib/admin/admin-projects";
import type { Assignment, PanelMember } from "@/lib/admin/queries";

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

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <select
          name="project_id"
          defaultValue={projectId || ""}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          required
        >
          <option value="">Choose project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.title}</option>
          ))}
        </select>
        <select
          name="panel_member_id"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          required
        >
          <option value="">Choose panel member</option>
          {panelMembers.map((member) => (
            <option key={member.id} value={member.id}>{member.full_name}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Assigning..." : "Assign panel member"}
      </Button>
    </form>
  );
}

export function RevokeAssignmentForm({ assignment }: { assignment: Assignment }) {
  const [state, formAction, isPending] = useActionState(revokeAssignmentAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="assignment_id" value={assignment.id} />
      <input type="hidden" name="project_id" value={assignment.project_id} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {assignment.is_active ? (
        <ConfirmSubmitButton
          title="Revoke panel access?"
          message={`This will immediately remove ${assignment.panel_member_name}'s access to this project.`}
          confirmLabel="Revoke access"
          variant="outline"
          size="sm"
          pending={isPending}
          pendingLabel="Revoking..."
        >
          Revoke
        </ConfirmSubmitButton>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled>
          Revoked
        </Button>
      )}
    </form>
  );
}
