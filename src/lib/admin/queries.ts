import type { AdminProjectRow } from "./admin-projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedUrlForProjectFile } from "@/lib/project/storage";

export type PanelMember = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
};

export type Assignment = {
  id: string;
  project_id: string;
  panel_member_id: string;
  assigned_at: string;
  revoked_at: string | null;
  is_active: boolean;
  panel_member_name: string;
  panel_member_email: string;
  project_title: string;
};

type RawAssignment = {
  id: string;
  project_id: string;
  panel_member_id: string;
  assigned_at: string;
  revoked_at: string | null;
  is_active: boolean;
  profiles:
    | { full_name: string; email: string }
    | { full_name: string; email: string }[]
    | null;
  projects: { title: string } | { title: string }[] | null;
};

export type AdminProjectDetail = AdminProjectRow & {
  abstract: string;
  technologies_used: string | null;
  github_url: string | null;
  demo_video_url: string | null;
  team_members: {
    id: string;
    full_name: string;
    student_id: string;
    email: string | null;
    role_in_team: string;
  }[];
  files: {
    id: string;
    file_type: string;
    file_name: string;
    storage_path: string;
    file_size: number;
    mime_type: string;
    signedUrl: string | null;
  }[];
  assignments: Assignment[];
};

type RawProject = {
  id: string;
  title: string;
  status: string;
  department: string;
  supervisor_name: string;
  submitted_at: string | null;
  profiles: { full_name: string } | null;
  panel_assignments: { id: string }[] | null;
};

function toProjectRow(project: RawProject): AdminProjectRow {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    department: project.department,
    supervisor_name: project.supervisor_name,
    team_leader_name: project.profiles?.full_name || "Unknown student",
    active_assignment_count: project.panel_assignments?.length || 0,
    submitted_at: project.submitted_at,
  };
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toAssignment(assignment: RawAssignment): Assignment {
  const profile = firstRelation(assignment.profiles);
  const project = firstRelation(assignment.projects);

  return {
    id: assignment.id,
    project_id: assignment.project_id,
    panel_member_id: assignment.panel_member_id,
    assigned_at: assignment.assigned_at,
    revoked_at: assignment.revoked_at,
    is_active: assignment.is_active,
    panel_member_name: profile?.full_name || "Unknown panel member",
    panel_member_email: profile?.email || "",
    project_title: project?.title || "Unknown project",
  };
}

export async function getAdminProjects() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, status, department, supervisor_name, submitted_at, profiles!projects_team_leader_id_fkey(full_name), panel_assignments!left(id)",
    )
    .is("panel_assignments.revoked_at", null)
    .eq("panel_assignments.is_active", true)
    .order("created_at", { ascending: false });

  return ((data || []) as unknown as RawProject[]).map(toProjectRow);
}

export async function getAdminProjectDetail(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, abstract, status, department, supervisor_name, technologies_used, github_url, demo_video_url, submitted_at, profiles!projects_team_leader_id_fkey(full_name), panel_assignments!left(id)",
    )
    .eq("id", projectId)
    .single();

  if (!project) return null;

  const [{ data: teamMembers }, { data: files }, assignments] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, student_id, email, role_in_team")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_files")
      .select("id, file_type, file_name, storage_path, file_size, mime_type")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    getAssignmentsForProject(projectId),
  ]);

  const row = toProjectRow(project as unknown as RawProject);
  const filesWithSignedUrls = await Promise.all(
    (files || []).map(async (file) => ({
      ...file,
      signedUrl: await createSignedUrlForProjectFile(supabase, file),
    })),
  );

  return {
    ...row,
    abstract: String(project.abstract || ""),
    technologies_used: project.technologies_used as string | null,
    github_url: project.github_url as string | null,
    demo_video_url: project.demo_video_url as string | null,
    team_members: teamMembers || [],
    files: filesWithSignedUrls,
    assignments: assignments || [],
  } as AdminProjectDetail;
}

export async function getPanelMembers() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, department")
    .eq("role", "panel_member")
    .order("full_name", { ascending: true });

  return (data || []) as PanelMember[];
}

export async function getAssignmentsForProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select("id, project_id, panel_member_id, assigned_at, revoked_at, is_active, profiles!panel_assignments_panel_member_id_fkey(full_name, email), projects(title)")
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: false });

  return ((data || []) as unknown as RawAssignment[]).map(toAssignment);
}

export async function getAllAssignments() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select("id, project_id, panel_member_id, assigned_at, revoked_at, is_active, profiles!panel_assignments_panel_member_id_fkey(full_name, email), projects(title)")
    .order("assigned_at", { ascending: false });

  return ((data || []) as unknown as RawAssignment[]).map(toAssignment);
}

export async function getSubmissionWindow() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("submission_windows")
    .select("id, cycle_id, opens_at, closes_at, allow_late_submission, allow_edit_after_submit, discussion_cycles!inner(id, name, is_active)")
    .eq("discussion_cycles.is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const raw = data as unknown as {
    id: string;
    cycle_id: string;
    opens_at: string;
    closes_at: string;
    allow_late_submission: boolean;
    allow_edit_after_submit: boolean;
    discussion_cycles:
      | { id: string; name: string; is_active: boolean }
      | { id: string; name: string; is_active: boolean }[]
      | null;
  };

  return {
    ...raw,
    discussion_cycles: Array.isArray(raw.discussion_cycles)
      ? raw.discussion_cycles[0] || null
      : raw.discussion_cycles,
  };
}
