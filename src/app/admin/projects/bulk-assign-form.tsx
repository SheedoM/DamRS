"use client";

import { useActionState, useEffect } from "react";
import { bulkAssignPanelMemberAction } from "../actions";
import { Button } from "@/components/ui/button";
import type { PanelMember } from "@/lib/admin/queries";
import { assignmentRoleOptions } from "@/lib/i18n/labels";

type BulkAssignFormProps = {
  selectedProjectIds: string[];
  panelMembers: PanelMember[];
  onSuccess: () => void;
};

const initialState = { ok: true, message: "" };

export function BulkAssignForm({ selectedProjectIds, panelMembers, onSuccess }: BulkAssignFormProps) {
  const [state, formAction, isPending] = useActionState(bulkAssignPanelMemberAction, initialState);

  useEffect(() => {
    if (state.ok && state.message) {
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="project_ids" value={selectedProjectIds.join(",")} />
      <select
        name="panel_member_id"
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 focus:border-slate-400 focus:outline-none"
        required
      >
        <option value="">اختر عضو اللجنة...</option>
        {panelMembers.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name}
          </option>
        ))}
      </select>
      <select
        name="role"
        defaultValue="committee"
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 focus:border-slate-400 focus:outline-none"
      >
        {assignmentRoleOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={isPending || selectedProjectIds.length === 0}>
        {isPending ? "جارٍ الإسناد..." : "إسناد للجميع"}
      </Button>
    </form>
  );
}
