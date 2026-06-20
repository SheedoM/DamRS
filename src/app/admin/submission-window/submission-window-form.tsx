"use client";

import { useActionState } from "react";

import { saveSubmissionWindowAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type SubmissionWindowFormProps = {
  windowData: {
    id: string;
    cycle_id: string;
    opens_at: string;
    closes_at: string;
    allow_late_submission: boolean;
    allow_edit_after_submit: boolean;
    discussion_cycles?: { id: string; name: string; is_active: boolean } | null;
  } | null;
};

export function SubmissionWindowForm({ windowData }: SubmissionWindowFormProps) {
  const [state, formAction, isPending] = useActionState(saveSubmissionWindowAction, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <input type="hidden" name="cycle_id" value={windowData?.cycle_id || ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cycle_name">Cycle name</Label>
          <Input id="cycle_name" name="cycle_name" defaultValue={windowData?.discussion_cycles?.name || "Graduation Projects 2025/2026"} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year">Academic year</Label>
          <Input id="academic_year" name="academic_year" defaultValue="2025/2026" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="department">Department</Label>
          <Input id="department" name="department" defaultValue="Faculty of Computers and Artificial Intelligence" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="opens_at">Opens at</Label>
          <Input id="opens_at" name="opens_at" type="datetime-local" defaultValue={toLocalDateTime(windowData?.opens_at)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closes_at">Closes at</Label>
          <Input id="closes_at" name="closes_at" type="datetime-local" defaultValue={toLocalDateTime(windowData?.closes_at)} required />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="allow_late_submission" defaultChecked={windowData?.allow_late_submission || false} />
        Allow late submission
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="allow_edit_after_submit" defaultChecked={windowData?.allow_edit_after_submit || false} />
        Allow edit after submit
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save submission window"}
      </Button>
    </form>
  );
}
