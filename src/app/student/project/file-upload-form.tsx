"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAutoClearMessage } from "@/hooks/use-auto-clear-message";

import { uploadProjectFileAction } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { RequiredProjectFileType } from "@/lib/project/submission.schema";
import { formatFileSize } from "@/lib/utils";

type FileUploadFormProps = {
  projectId: string;
  fileType: RequiredProjectFileType;
  label: string;
  accept: string;
  maxSizeBytes: number;
};

const initialState = { ok: true, message: "" };

export function FileUploadForm({ projectId, fileType, label, accept, maxSizeBytes }: FileUploadFormProps) {
  const [state, formAction, isPending] = useActionState(uploadProjectFileAction, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const showSuccess = useAutoClearMessage(state.ok ? state.message : "");
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

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
          const file = fileInputRef.current?.files?.[0];
          if (!file) return;
          if (file.size > maxSizeBytes) {
            setFileSizeError(`حجم الملف كبير جدًا. الحد الأقصى ${formatFileSize(maxSizeBytes)}.`);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }
          setFileSizeError(null);
          formRef.current?.requestSubmit();
        }}
      />
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">اختر ملفًا وسيتم رفعه فورًا.</p>
      </div>
      {fileSizeError ? <Alert>{fileSizeError}</Alert> : null}
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {showSuccess ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {isPending ? "جارٍ الرفع..." : "رفع"}
      </Button>
    </form>
  );
}
