"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";
import {
  getMissingSubmissionRequirements,
  projectFileTypes,
  projectFormSchema,
  type RequiredProjectFileType,
} from "@/lib/project/submission.schema";
import { buildProjectStoragePath, getBucketForFileType } from "@/lib/project/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  message: string;
};

const fileUploadSchema = z.object({
  projectId: z.string().uuid(),
  fileType: z.enum(projectFileTypes),
});

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
    .single();

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
    email: String(formData.get(`team_members.${index}.email`) || ""),
    role_in_team: String(formData.get(`team_members.${index}.role_in_team`) || "member"),
  }));

  return projectFormSchema.safeParse({
    title: formData.get("title"),
    abstract: formData.get("abstract"),
    department: formData.get("department"),
    supervisor_name: formData.get("supervisor_name"),
    technologies_used: formData.get("technologies_used"),
    github_url: formData.get("github_url"),
    demo_video_url: formData.get("demo_video_url"),
    team_members,
  });
}

async function writeAuditLog(action: string, entityType: string, entityId: string, metadata = {}) {
  const supabase = await createSupabaseServerClient();
  const { profile } = await requireRole(["student"]);

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function createProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["student"]);
  const parsed = parseProjectForm(formData);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid project details." };
  }

  const cycleId = await getOpenActiveCycleId();
  if (!cycleId) {
    return { ok: false, message: "There is no open submission window right now." };
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
    return { ok: false, message: projectError?.message || "Unable to create project." };
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

  await writeAuditLog("student_created_project", "project", createdProject.id);
  revalidatePath("/student");
  revalidatePath("/student/project");
  redirect("/student/project");
}

export async function updateProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["student"]);
  const projectId = String(formData.get("project_id") || "");
  const parsed = parseProjectForm(formData);

  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, message: "Invalid project id." };
  }

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid project details." };
  }

  const supabase = await createSupabaseServerClient();
  const { team_members, ...project } = parsed.data;
  const { error: projectError } = await supabase
    .from("projects")
    .update(project)
    .eq("id", projectId);

  if (projectError) {
    return { ok: false, message: projectError.message };
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

  await writeAuditLog("student_updated_project", "project", projectId);
  revalidatePath("/student");
  revalidatePath("/student/project");
  redirect("/student/project");
}

export async function uploadProjectFileAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { profile } = await requireRole(["student"]);
  const parsed = fileUploadSchema.safeParse({
    projectId: formData.get("project_id"),
    fileType: formData.get("file_type"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid file upload request." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, cycle_id")
    .eq("id", parsed.data.projectId)
    .single();

  if (projectError || !project) {
    return { ok: false, message: projectError?.message || "Project not found." };
  }

  const fileType = parsed.data.fileType as RequiredProjectFileType;
  const bucket = getBucketForFileType(fileType);
  const storagePath = buildProjectStoragePath({
    cycleId: project.cycle_id as string,
    projectId: project.id as string,
    fileName: file.name,
  });

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { error: metadataError } = await supabase
    .from("project_files")
    .upsert(
      {
        project_id: project.id,
        file_type: fileType,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        uploaded_by: profile.id,
      },
      { onConflict: "storage_path" },
    );

  if (metadataError) {
    return { ok: false, message: metadataError.message };
  }

  await writeAuditLog("student_uploaded_project_file", "project", project.id as string, {
    file_type: fileType,
    file_name: file.name,
  });
  revalidatePath("/student/project");
  revalidatePath("/student/project/status");
  return { ok: true, message: "File uploaded." };
}

export async function submitProjectAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["student"]);
  const parsed = submitProjectSchema.safeParse({
    projectId: formData.get("project_id"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid project id." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, abstract, department, supervisor_name, demo_video_url")
    .eq("id", parsed.data.projectId)
    .single();

  if (projectError || !project) {
    return { ok: false, message: projectError?.message || "Project not found." };
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
    abstract: project.abstract as string | null,
    department: project.department as string | null,
    supervisor_name: project.supervisor_name as string | null,
    demo_video_url: project.demo_video_url as string | null,
    teamMemberCount: teamMemberCount || 0,
    fileTypes: (files || []).map((file) => String(file.file_type)),
  });

  if (missing.length > 0) {
    return { ok: false, message: `Missing: ${missing.join(", ")}.` };
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

  await writeAuditLog("student_submitted_project", "project", parsed.data.projectId);
  revalidatePath("/student");
  revalidatePath("/student/project");
  revalidatePath("/student/project/status");
  redirect("/student/project/status");
}
