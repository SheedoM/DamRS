"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";
import {
  getMissingSubmissionRequirements,
  projectFormSchema,
} from "@/lib/project/submission.schema";
import { getAppSettings } from "@/lib/admin/app-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import { writeAuditLog } from "@/lib/audit";



const submitProjectSchema = z.object({
  projectId: z.string().uuid(),
});

async function getOpenActiveCycleId() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("submission_windows")
    .select("cycle_id, discussion_cycles!inner(is_active)")
    .eq("discussion_cycles.is_active", true)
    .lte("opens_at", new Date().toISOString())
    .or(`closes_at.gte.${new Date().toISOString()},allow_late_submission.eq.true`)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.cycle_id as string;
}

function parseProjectForm(formData: FormData) {
  const teamMemberIndexes = Array.from(formData.keys())
    .map((key) => key.match(/^team_members\.(\d+)\.full_name$/)?.[1])
    .filter((value): value is string => Boolean(value));

  const team_members = teamMemberIndexes.map((index) => ({
    full_name: String(formData.get(`team_members.${index}.full_name`) || ""),
    student_id: String(formData.get(`team_members.${index}.student_id`) || ""),
    national_id: String(formData.get(`team_members.${index}.national_id`) || ""),
    program: String(formData.get(`team_members.${index}.program`) || ""),
    role_in_team: String(formData.get(`team_members.${index}.role_in_team`) || "member"),
  }));

  return projectFormSchema.safeParse({
    title: formData.get("title"),
    title_en: formData.get("title_en"),
    abstract: formData.get("abstract"),
    supervisor_name: formData.get("supervisor_name"),
    technologies_used: formData.get("technologies_used"),
    github_url: formData.get("github_url"),
    demo_video_url: formData.get("demo_video_url"),
    team_members,
  });
}



export async function createProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["student"]);
  const parsed = parseProjectForm(formData);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات المشروع غير صالحة." };
  }

  const { max_team_members } = await getAppSettings();
  if (parsed.data.team_members.length > max_team_members) {
    return { ok: false, message: `الحد الأقصى لعدد أعضاء الفريق هو ${max_team_members}.` };
  }

  const cycleId = await getOpenActiveCycleId();
  if (!cycleId) {
    return { ok: false, message: "لا توجد نافذة تسليم مفتوحة حاليًا." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("team_leader_id", profile.id)
    .limit(1)
    .maybeSingle();

  if (existingProject) {
    redirect("/student/project");
  }

  const { team_members, ...project } = parsed.data;
  const { data: createdProject, error: projectError } = await supabase
    .from("projects")
    .insert({
      ...project,
      cycle_id: cycleId,
      team_leader_id: profile.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (projectError || !createdProject) {
    return { ok: false, message: projectError?.message || "تعذّر إنشاء المشروع." };
  }

  const { error: teamError } = await supabase.from("team_members").insert(
    team_members.map((member) => ({
      ...member,
      project_id: createdProject.id,
    })),
  );

  if (teamError) {
    return { ok: false, message: teamError.message };
  }

  await writeAuditLog(profile.id, "student_created_project", "project", createdProject.id);
  revalidatePath("/", "layout");
  redirect("/student/project?success=project-created");
}

export async function updateProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["student"]);
  const projectId = String(formData.get("project_id") || "");
  const parsed = parseProjectForm(formData);

  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, message: "معرّف المشروع غير صالح." };
  }

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات المشروع غير صالحة." };
  }

  const { max_team_members } = await getAppSettings();
  if (parsed.data.team_members.length > max_team_members) {
    return { ok: false, message: `الحد الأقصى لعدد أعضاء الفريق هو ${max_team_members}.` };
  }

  const supabase = await createSupabaseServerClient();
  const { team_members, ...project } = parsed.data;
  const { data: updatedProject, error: projectError } = await supabase
    .from("projects")
    .update(project)
    .eq("id", projectId)
    .eq("team_leader_id", profile.id)
    .select("id")
    .single();

  if (projectError || !updatedProject) {
    return { ok: false, message: "لم يتم العثور على المشروع أو لا تملك صلاحية الوصول." };
  }

  const { error: deleteError } = await supabase
    .from("team_members")
    .delete()
    .eq("project_id", projectId);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  const { error: teamError } = await supabase.from("team_members").insert(
    team_members.map((member) => ({
      ...member,
      project_id: projectId,
    })),
  );

  if (teamError) {
    return { ok: false, message: teamError.message };
  }
  await writeAuditLog(profile.id, "student_updated_project", "project", projectId);
  revalidatePath("/", "layout");
  redirect("/student/project?success=project-updated");
}

export async function submitProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["student"]);
  const parsed = submitProjectSchema.safeParse({
    projectId: formData.get("project_id"),
  });

  if (!parsed.success) {
    return { ok: false, message: "معرّف المشروع غير صالح." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, title_en, abstract, supervisor_name, demo_video_url")
    .eq("id", parsed.data.projectId)
    .single();

  if (projectError || !project) {
    return { ok: false, message: projectError?.message || "لم يتم العثور على المشروع." };
  }

  const [{ count: teamMemberCount }, { data: files }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", parsed.data.projectId),
    supabase
      .from("project_files")
      .select("file_type")
      .eq("project_id", parsed.data.projectId),
  ]);

  const missing = getMissingSubmissionRequirements({
    title: project.title as string | null,
    title_en: project.title_en as string | null,
    abstract: project.abstract as string | null,
    supervisor_name: project.supervisor_name as string | null,
    demo_video_url: project.demo_video_url as string | null,
    teamMemberCount: teamMemberCount || 0,
    fileTypes: (files || []).map((file) => String(file.file_type)),
  });

  if (missing.length > 0) {
    return { ok: false, message: `العناصر الناقصة: ${missing.join("، ")}.` };
  }

  const { error: submitError } = await supabase
    .from("projects")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.projectId);

  if (submitError) {
    return { ok: false, message: submitError.message };
  }

  await writeAuditLog(profile.id, "student_submitted_project", "project", parsed.data.projectId);
  revalidatePath("/", "layout");
  redirect("/student/project?success=submitted");
}
