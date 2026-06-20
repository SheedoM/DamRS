"use client";

import { useActionState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAutoClearMessage } from "@/hooks/use-auto-clear-message";

import { uploadProjectFileAction } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const showSuccess = useAutoClearMessage(state.ok ? state.message : "");

  useEffect(() => {
    if (state.ok && state.message) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    }
  }, [router, state.message, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-md border border-slate-200 p-4">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="file_type" value={fileType} />
      <input
        ref={fileInputRef}
        id={fileType}
        name="file"
        type="file"
        accept={accept}
        className="sr-only"
        onChange={() => {
          if (fileInputRef.current?.files?.length) {
            formRef.current?.requestSubmit();
          }
        }}
      />
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">Choose a file and it uploads immediately.</p>
      </div>
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {showSuccess ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Uploading..." : "Upload"}
      </Button>
    </form>
  );
}
