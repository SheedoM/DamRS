"use client";

import { useActionState, useState } from "react";

import { deletePanelMemberAction, updatePanelMemberAction } from "../actions";
import { PasswordToggle } from "./password-toggle";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { panelMemberTypeLabel } from "@/lib/i18n/labels";
import type { PanelMember } from "@/lib/admin/queries";

const initialState = { ok: true, message: "" };

const typeOptions = ["supervisor", "referee", "committee_head"] as const;

const selectClassName =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2";

export function PanelMemberCard({ member }: { member: PanelMember }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updatePanelMemberAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deletePanelMemberAction, initialState);

  // Collapse the edit form once a save succeeds.
  const [prevUpdate, setPrevUpdate] = useState(updateState);
  if (updateState !== prevUpdate) {
    setPrevUpdate(updateState);
    if (updateState.ok && updateState.message) setEditing(false);
  }

  return (
    <div className="rounded-md border border-slate-200 p-3">
      {!editing ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-950">{member.full_name}</p>
            {member.panel_member_type ? (
              <Badge tone="info">{panelMemberTypeLabel(member.panel_member_type)}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">{member.email}</p>
          <p className="text-sm text-slate-500">{member.department || "بدون قسم"}</p>
          <PasswordToggle password={member.temp_password} />
          {!deleteState.ok ? <div className="mt-2"><Alert>{deleteState.message}</Alert></div> : null}
          {updateState.ok && updateState.message ? (
            <p className="mt-2 text-sm text-emerald-700">{updateState.message}</p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              تعديل
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="panel_member_id" value={member.id} />
              <ConfirmSubmitButton
                title="حذف عضو اللجنة؟"
                message="سيؤدي هذا إلى حذف حساب عضو اللجنة وإزالة جميع إسناداته وأي درجات أدخلها. لا يمكن التراجع."
                confirmLabel="حذف نهائي"
                variant="ghost"
                size="sm"
                pending={deletePending}
                pendingLabel="جارٍ الحذف..."
              >
                حذف
              </ConfirmSubmitButton>
            </form>
          </div>
        </>
      ) : (
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="panel_member_id" value={member.id} />
          {!updateState.ok ? <Alert>{updateState.message}</Alert> : null}
          <div className="space-y-2">
            <Label htmlFor={`pm-${member.id}-name`}>الاسم الكامل</Label>
            <Input id={`pm-${member.id}-name`} name="full_name" defaultValue={member.full_name} required />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`pm-${member.id}-dept`}>القسم</Label>
              <Input id={`pm-${member.id}-dept`} name="department" defaultValue={member.department || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pm-${member.id}-type`}>الدور</Label>
              <select
                id={`pm-${member.id}-type`}
                name="panel_member_type"
                className={selectClassName}
                defaultValue={member.panel_member_type || "referee"}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{panelMemberTypeLabel(t)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
