"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useActionState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { createProjectAction, updateProjectAction } from "./actions";
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
import type { StudentProject, TeamMember } from "@/lib/project/queries";
import { cn } from "@/lib/utils";

type ProjectFormProps = {
  mode: "create" | "edit";
  project?: StudentProject;
  teamMembers?: TeamMember[];
};

const initialState = { ok: true, message: "" };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

export function ProjectForm({ mode, project, teamMembers = [] }: ProjectFormProps) {
  const action = mode === "create" ? createProjectAction : updateProjectAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const {
    register,
    control,
    formState: { errors },
  } = useForm<ProjectFormInput, unknown, ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: project?.title || "",
      abstract: project?.abstract || "",
      department: project?.department || "Faculty of Computers and Artificial Intelligence",
      supervisor_name: project?.supervisor_name || "",
      technologies_used: project?.technologies_used || "",
      github_url: project?.github_url || "",
      demo_video_url: project?.demo_video_url || "",
      team_members:
        teamMembers.length > 0
          ? teamMembers.map((member) => ({
              full_name: member.full_name,
              student_id: member.student_id,
              email: member.email || "",
              role_in_team: member.role_in_team,
            }))
          : [{ full_name: "", student_id: "", email: "", role_in_team: "team_leader" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "team_members",
  });

  return (
    <form action={formAction} className="space-y-6">
      {project ? <input type="hidden" name="project_id" value={project.id} /> : null}
      {!state.ok ? <Alert>{state.message}</Alert> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Project title</Label>
            <Input id="title" {...register("title")} />
            <FieldError message={errors.title?.message} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="abstract">Abstract</Label>
            <Textarea id="abstract" {...register("abstract")} />
            <FieldError message={errors.abstract?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" {...register("department")} />
            <FieldError message={errors.department?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supervisor_name">Supervisor name</Label>
            <Input id="supervisor_name" {...register("supervisor_name")} />
            <FieldError message={errors.supervisor_name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technologies_used">Technologies used</Label>
            <Input id="technologies_used" {...register("technologies_used")} />
            <FieldError message={errors.technologies_used?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github_url">GitHub URL</Label>
            <Input id="github_url" type="url" {...register("github_url")} />
            <FieldError message={errors.github_url?.message} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="demo_video_url">Demo video URL</Label>
            <Input id="demo_video_url" type="url" {...register("demo_video_url")} />
            <FieldError message={errors.demo_video_url?.message} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Team members</h2>
            <p className="text-sm text-slate-500">Add the team leader and all project members.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ full_name: "", student_id: "", email: "", role_in_team: "member" })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add member
          </Button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[1fr_0.8fr_1fr_0.7fr_auto]">
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-name`}>Full name</Label>
                <Input id={`team-${index}-name`} {...register(`team_members.${index}.full_name`)} />
                <FieldError message={errors.team_members?.[index]?.full_name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-student-id`}>Student ID</Label>
                <Input id={`team-${index}-student-id`} {...register(`team_members.${index}.student_id`)} />
                <FieldError message={errors.team_members?.[index]?.student_id?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-email`}>Email</Label>
                <Input id={`team-${index}-email`} type="email" {...register(`team_members.${index}.email`)} />
                <FieldError message={errors.team_members?.[index]?.email?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`team-${index}-role`}>Role</Label>
                <select
                  id={`team-${index}-role`}
                  {...register(`team_members.${index}.role_in_team`)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="team_leader">Team leader</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="tester">Tester</option>
                  <option value="member">Member</option>
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
                aria-label="Remove team member"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : mode === "create" ? "Create project" : "Save changes"}
        </Button>
        <Link href="/student/project" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
