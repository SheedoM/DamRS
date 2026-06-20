"use client";

import { useActionState, useEffect, useState } from "react";

import { createPanelMemberAction } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { ok: true, message: "" };

export function CreatePanelMemberForm() {
  const [state, formAction, isPending] = useActionState(createPanelMemberAction, initialState);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && state.message) {
      const match = state.message.match(/temporary password:\s*(\S+)/i);
      if (match) setCreatedPassword(match[1]);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      
      {createdPassword ? (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-5">
          <h3 className="font-semibold text-slate-950">Panel member created</h3>
          <p className="mt-2 text-sm text-slate-700">
            Save this temporary password now — it cannot be retrieved later.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="rounded bg-white px-3 py-2 font-mono text-sm border border-slate-200">{createdPassword}</code>
            <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(createdPassword)}>
              Copy
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setCreatedPassword(null)}>
            Done
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
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
