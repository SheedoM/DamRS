"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { createProjectAction, updateProjectAction } from "./actions";
import { createAdminProjectAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  projectFormSchema,
  type ProjectFormData,
  type ProjectFormInput,
} from "@/lib/project/submission.schema";
import { programOptions } from "@/lib/i18n/labels";
import type { StudentProject, TeamMember } from "@/lib/project/queries";
import { cn } from "@/lib/utils";

type ProjectFormProps = {
  mode: "create" | "edit" | "admin-create";
  project?: StudentProject;
  teamMembers?: TeamMember[];
  maxTeamMembers: number;
};

const initialState = { ok: true, message: "" };

const roleOptions = [
  { value: "team_leader", label: "قائد الفريق" },
  { value: "developer", label: "مطوّر" },
  { value: "designer", label: "مصمم" },
  { value: "tester", label: "مختبِر" },
  { value: "member", label: "عضو" },
];

const selectClassName =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

export function ProjectForm({ mode, project, teamMembers = [], maxTeamMembers }: ProjectFormProps) {
  const isAdminCreate = mode === "admin-create";
  const action = isAdminCreate
    ? createAdminProjectAction
    : mode === "create"
      ? createProjectAction
      : updateProjectAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const {
    register,
    control,
    formState: { errors, isDirty },
  } = useForm<ProjectFormInput, unknown, ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: project?.title || "",
      abstract: project?.abstract || "",
      program: (project?.program as ProjectFormInput["program"]) || undefined,
      supervisor_name: project?.supervisor_name || "",
      technologies_used: project?.technologies_used || "",
      github_url: project?.github_url || "",
      demo_video_url: project?.demo_video_url || "",
      team_members:
        teamMembers.length > 0
          ? teamMembers.map((member) => ({
              full_name: member.full_name,
              student_id: member.student_id,
              national_id: member.national_id || "",
              email: member.email || "",
              role_in_team: member.role_in_team,
            }))
          : [{ full_name: "", student_id: "", national_id: "", email: "", role_in_team: "team_leader" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "team_members",
  });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const atMemberLimit = fields.length >= maxTeamMembers;

  return (
    <form action={formAction} className="space-y-6">
      {project ? <input type="hidden" name="project_id" value={project.id} /> : null}
      {!state.ok ? <Alert>{state.message}</Alert> : null}
      {isAdminCreate && state.ok && state.message ? (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm text-slate-800">
          {state.message}
        </div>
      ) : null}
      {isAdminCreate ? (
        <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-600">
          سيتم إنشاء حساب دخول لقائد الفريق (العضو ذي الدور «قائد الفريق») تلقائيًا — تأكد من إدخال بريده الإلكتروني.
        </p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">عنوان المشروع</Label>
            <Input id="title" {...register("title")} />
            <FieldError message={errors.title?.message} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="abstract">الملخص</Label>
            <Textarea id="abstract" {...register("abstract")} />
            <FieldError message={errors.abstract?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program">البرنامج</Label>
            <select id="program" {...register("program")} className={selectClassName} defaultValue="">
              <option value="" disabled>
                اختر البرنامج
              </option>
              {programOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.program?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supervisor_name">اسم المشرف</Label>
            <Input id="supervisor_name" {...register("supervisor_name")} />
            <FieldError message={errors.supervisor_name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technologies_used">التقنيات المستخدمة</Label>
            <Input id="technologies_used" {...register("technologies_used")} />
            <FieldError message={errors.technologies_used?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github_url">رابط GitHub</Label>
            <Input id="github_url" type="url" {...register("github_url")} />
            <FieldError message={errors.github_url?.message} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="demo_video_url">رابط فيديو العرض</Label>
            <Input id="demo_video_url" type="url" {...register("demo_video_url")} />
            <FieldError message={errors.demo_video_url?.message} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">أعضاء الفريق</h2>
            <p className="text-sm text-slate-500">
              أضف قائد الفريق وجميع أعضاء المشروع (بحد أقصى {maxTeamMembers} أعضاء).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={atMemberLimit}
            onClick={() =>
              append({ full_name: "", student_id: "", national_id: "", email: "", role_in_team: "member" })
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة عضو
          </Button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[1fr_0.8fr_0.9fr_1fr_0.7fr_auto]">
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-name`}>الاسم الكامل</Label>
                <Input id={`team-${index}-name`} {...register(`team_members.${index}.full_name`)} />
                <FieldError message={errors.team_members?.[index]?.full_name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-student-id`}>الرقم الجامعي</Label>
                <Input id={`team-${index}-student-id`} {...register(`team_members.${index}.student_id`)} />
                <FieldError message={errors.team_members?.[index]?.student_id?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-national-id`}>الرقم القومي</Label>
                <Input
                  id={`team-${index}-national-id`}
                  inputMode="numeric"
                  {...register(`team_members.${index}.national_id`)}
                />
                <FieldError message={errors.team_members?.[index]?.national_id?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-email`}>البريد الإلكتروني</Label>
                <Input id={`team-${index}-email`} type="email" {...register(`team_members.${index}.email`)} />
                <FieldError message={errors.team_members?.[index]?.email?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-role`}>الدور</Label>
                <select
                  id={`team-${index}-role`}
                  {...register(`team_members.${index}.role_in_team`)}
                  className={selectClassName}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.team_members?.[index]?.role_in_team?.message} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label="إزالة عضو الفريق"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "جارٍ الحفظ..." : mode === "edit" ? "حفظ التغييرات" : "إنشاء المشروع"}
        </Button>
        <Link href={isAdminCreate ? "/admin/projects" : "/student/project"} className={cn(buttonVariants({ variant: "outline" }))}>
          {isAdminCreate ? "العودة إلى المشاريع" : "إلغاء"}
        </Link>
      </div>
    </form>
  );
}
