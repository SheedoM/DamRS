"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  buildProjectStoragePath,
  getBucketForFileType,
} from "@/lib/project/storage";
import type { RequiredProjectFileType } from "@/lib/project/submission.schema";
import type { ProjectFile } from "@/lib/project/queries";
import { cn, formatFileSize } from "@/lib/utils";

type FileUploadFormProps = {
  projectId: string;
  cycleId: string;
  uploadedBy: string;
  fileType: RequiredProjectFileType;
  label: string;
  accept: string;
  maxSizeBytes: number;
  existingFile?: ProjectFile;
};

// Force a bucket-allowed content type when the browser reports none.
const fallbackContentType: Record<RequiredProjectFileType, string> = {
  documentation_pdf: "application/pdf",
  source_code_zip: "application/zip",
  presentation_file: "application/pdf",
};

export function FileUploadForm({
  projectId,
  cycleId,
  uploadedBy,
  fileType,
  label,
  accept,
  maxSizeBytes,
  existingFile,
}: FileUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > maxSizeBytes) {
      setError(`حجم الملف كبير جدًا. الحد الأقصى ${formatFileSize(maxSizeBytes)}.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const bucket = getBucketForFileType(fileType);
      const storagePath = buildProjectStoragePath({ cycleId, projectId, fileName: file.name });
      const contentType =
        file.type && file.type !== "application/octet-stream" ? file.type : fallbackContentType[fileType];

      // Upload straight to Supabase Storage from the browser — avoids routing the
      // file through a server action (Vercel caps function request bodies at ~4.5MB).
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, { contentType, upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { error: metaError } = await supabase.from("project_files").upsert(
        {
          project_id: projectId,
          file_type: fileType,
          file_name: file.name,
          storage_path: storagePath,
          file_size: file.size,
          mime_type: contentType,
          uploaded_by: uploadedBy,
        },
        { onConflict: "storage_path" },
      );
      if (metaError) {
        setError(metaError.message);
        return;
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "تعذّر رفع الملف.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-4">
      <input
        ref={fileInputRef}
        id={fileType}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={() => {
          const file = fileInputRef.current?.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">اختر ملفًا وسيتم رفعه فورًا.</p>
      </div>

      {existingFile ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-2 text-sm">
          <span className="truncate text-slate-700">
            {existingFile.file_name}
            <span className="text-slate-400"> · {formatFileSize(existingFile.file_size)}</span>
          </span>
          {existingFile.signedUrl ? (
            <a
              href={existingFile.signedUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              فتح
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}

      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {isUploading ? "جارٍ الرفع..." : existingFile ? "استبدال الملف" : "رفع"}
      </Button>
    </div>
  );
}
