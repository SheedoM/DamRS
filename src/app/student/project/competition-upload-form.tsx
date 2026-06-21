"use client";

import { useRef, useState } from "react";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { COMPETITION_BUCKET, buildProjectStoragePath } from "@/lib/project/storage";
import type { ProjectFile } from "@/lib/project/queries";
import { cn, formatFileSize } from "@/lib/utils";

const MAX_SIZE = 50 * 1024 * 1024;

export function CompetitionUploadForm({
  projectId,
  cycleId,
  uploadedBy,
  files,
  canEdit,
}: {
  projectId: string;
  cycleId: string;
  uploadedBy: string;
  files: ProjectFile[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setError(null);
    if (!name.trim()) {
      setError("اكتب اسم المسابقة أولًا.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(`حجم الملف كبير جدًا. الحد الأقصى ${formatFileSize(MAX_SIZE)}.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // Prefix the path with the competition name so multiple proofs don't collide.
      const storagePath = buildProjectStoragePath({
        cycleId,
        projectId,
        fileName: `competition-${name}-${Date.now()}-${file.name}`,
      });
      const { error: upErr } = await supabase.storage
        .from(COMPETITION_BUCKET)
        .upload(storagePath, file, { contentType: "application/pdf", upsert: true });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { error: metaErr } = await supabase.from("project_files").insert({
        project_id: projectId,
        file_type: "competition_proof",
        file_name: file.name,
        note: name.trim(),
        storage_path: storagePath,
        file_size: file.size,
        mime_type: "application/pdf",
        uploaded_by: uploadedBy,
      });
      if (metaErr) {
        setError(metaErr.message);
        return;
      }
      setName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الملف.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(file: ProjectFile) {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.storage.from(COMPETITION_BUCKET).remove([file.storage_path]);
      await supabase.from("project_files").delete().eq("id", file.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-4">
      <div>
        <p className="text-sm font-medium text-slate-900">إثبات الاشتراك في المسابقات (اختياري)</p>
        <p className="mt-1 text-xs text-slate-500">اكتب اسم المسابقة وارفع ملف PDF يثبت الاشتراك. يمكنك إضافة أكثر من مسابقة.</p>
      </div>

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-2 text-sm">
              <span className="min-w-0 truncate text-slate-700">
                <span className="font-medium">{file.note || "مسابقة"}</span>
                <span className="text-slate-400"> · {file.file_name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {file.signedUrl ? (
                  <a
                    href={file.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    فتح
                  </a>
                ) : null}
                {canEdit ? (
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => remove(file)} aria-label="حذف">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">لم تتم إضافة أي مسابقات.</p>
      )}

      {error ? <Alert>{error}</Alert> : null}

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="competition_name">اسم المسابقة</Label>
            <Input
              id="competition_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: معرض القاهرة للابتكار"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={() => {
              const file = fileInputRef.current?.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button type="button" variant="outline" disabled={busy} onClick={() => fileInputRef.current?.click()}>
            {busy ? <Upload className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {busy ? "جارٍ الرفع..." : "إضافة مسابقة"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
