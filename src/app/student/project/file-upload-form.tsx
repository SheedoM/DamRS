"use client";

import { useActionState } from "react";

import { uploadProjectFileAction } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RequiredProjectFileType } from "@/lib/project/submission.schema";

type FileUploadFormProps = {
  projectId: string;
  fileType: RequiredProjectFileType;
  label: string;
  accept: string;
};

const initialState = { ok: true, message: "" };

export function FileUploadForm({ projectId, fileType, label, accept }: FileUploadFormProps) {
  const [state, formAction, isPending] = useActionState(uploadProjectFileAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-slate-200 p-4">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="file_type" value={fileType} />
      <div className="space-y-2">
        <Label htmlFor={fileType}>{label}</Label>
        <Input id={fileType} name="file" type="file" accept={accept} required />
      </div>
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Uploading..." : "Upload"}
      </Button>
    </form>
  );
}
