"use client";

import { useActionState } from "react";

import { updateAppSettingsAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

export function AppSettingsForm({ maxTeamMembers }: { maxTeamMembers: number }) {
  const [state, formAction, isPending] = useActionState(updateAppSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {state.message ? (
        state.ok ? (
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
        ) : (
          <Alert>{state.message}</Alert>
        )
      ) : null}

      <div className="max-w-xs space-y-2">
        <Label htmlFor="max_team_members">الحد الأقصى لعدد أعضاء الفريق</Label>
        <Input
          id="max_team_members"
          name="max_team_members"
          type="number"
          min={1}
          max={10}
          defaultValue={maxTeamMembers}
          required
        />
        <p className="text-xs text-slate-500">قيمة بين 1 و 10. تُطبَّق على المشاريع الجديدة والمعدّلة.</p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </form>
  );
}
