"use client";

import { useActionState } from "react";

import { createPanelMemberAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

export function CreatePanelMemberForm() {
  const [state, formAction, isPending] = useActionState(createPanelMemberAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input id="department" name="department" defaultValue="Faculty of Computers and Artificial Intelligence" required />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create panel member"}
      </Button>
    </form>
  );
}
