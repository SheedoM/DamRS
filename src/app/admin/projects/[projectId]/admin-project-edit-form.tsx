"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { updateAdminProjectAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { programOptions } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

export type AdminEditableProject = {
  id: string;
  project_number: string | null;
  title: string | null;
  title_en: string | null;
  supervisor_name: string | null;
  abstract: string | null;
  technologies_used: string | null;
  github_url: string | null;
  demo_video_url: string | null;
  source_code_url: string | null;
  leader_university_id: string | null;
  leader_full_name: string | null;
  leader_program: string | null;
};

export type AdminEditableMember = {
  full_name: string;
  student_id: string;
  program: string | null;
  role_in_team: string;
};

const initialState = { ok: true, message: "" };

const roleOptions = [
  { value: "team_leader", label: "قائد الفريق" },
  { value: "member", label: "عضو" },
];

const selectClassName =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type FormValues = {
  team_members: AdminEditableMember[];
};

export function AdminProjectEditForm({
  project,
  teamMembers,
}: {
  project: AdminEditableProject;
  teamMembers: AdminEditableMember[];
}) {
  const [state, formAction, isPending] = useActionState(updateAdminProjectAction, initialState);
  const { register, control } = useForm<FormValues>({
    defaultValues: {
      team_members:
        teamMembers.length > 0
          ? teamMembers.map((m) => ({
              full_name: m.full_name,
              student_id: m.student_id,
              program: m.program || "",
              role_in_team: m.role_in_team || "member",
            }))
          : [{ full_name: "", student_id: "", program: "", role_in_team: "team_leader" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "team_members" });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="project_id" value={project.id} />
      {!state.ok ? <Alert>{state.message}</Alert> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-950">بيانات المشروع</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="project_number">رقم المشروع</Label>
            <Input id="project_number" name="project_number" defaultValue={project.project_number || ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supervisor_name">اسم المشرف</Label>
            <Input id="supervisor_name" name="supervisor_name" defaultValue={project.supervisor_name || ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">عنوان المشروع (بالعربية)</Label>
            <Input id="title" name="title" defaultValue={project.title || ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title_en">عنوان المشروع (بالإنجليزية)</Label>
            <Input id="title_en" name="title_en" dir="ltr" defaultValue={project.title_en || ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="abstract">الملخص</Label>
            <Textarea id="abstract" name="abstract" defaultValue={project.abstract || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technologies_used">التقنيات المستخدمة</Label>
            <Input id="technologies_used" name="technologies_used" defaultValue={project.technologies_used || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github_url">رابط GitHub</Label>
            <Input id="github_url" name="github_url" defaultValue={project.github_url || ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="demo_video_url">رابط فيديو العرض</Label>
            <Input id="demo_video_url" name="demo_video_url" defaultValue={project.demo_video_url || ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="source_code_url">رابط الكود المصدري</Label>
            <Input id="source_code_url" name="source_code_url" defaultValue={project.source_code_url || ""} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-950">قائد الفريق المعيّن</h2>
        <p className="mb-4 text-sm text-slate-500">
          يحدد الرقم الجامعي مَن يستطيع التسجيل والمطالبة بهذا المشروع (قبل تسجيل القائد).
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="leader_university_id">الرقم الجامعي</Label>
            <Input id="leader_university_id" name="leader_university_id" defaultValue={project.leader_university_id || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leader_full_name">اسم القائد</Label>
            <Input id="leader_full_name" name="leader_full_name" defaultValue={project.leader_full_name || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leader_program">البرنامج</Label>
            <select id="leader_program" name="leader_program" className={selectClassName} defaultValue={project.leader_program || ""}>
              <option value="">—</option>
              {programOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">أعضاء الفريق</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ full_name: "", student_id: "", program: "", role_in_team: "member" })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة عضو
          </Button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[1fr_0.9fr_1fr_0.7fr_auto]">
              <div className="space-y-2">
                <Label htmlFor={`tm-${index}-name`}>الاسم</Label>
                <Input id={`tm-${index}-name`} {...register(`team_members.${index}.full_name`)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`tm-${index}-sid`}>الرقم الجامعي</Label>
                <Input id={`tm-${index}-sid`} {...register(`team_members.${index}.student_id`)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`tm-${index}-prog`}>البرنامج</Label>
                <select id={`tm-${index}-prog`} className={selectClassName} {...register(`team_members.${index}.program`)}>
                  <option value="">—</option>
                  {programOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`tm-${index}-role`}>الدور</Label>
                <select id={`tm-${index}-role`} className={selectClassName} {...register(`team_members.${index}.role_in_team`)}>
                  {roleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end"
                onClick={() => remove(index)}
                aria-label="إزالة العضو"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </Button>
        <Link href={`/admin/projects/${project.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
          إلغاء
        </Link>
      </div>
    </form>
  );
}
