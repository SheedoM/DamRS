import type { AdminProjectRow } from "./admin-projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedUrlForProjectFile } from "@/lib/project/storage";
import { getOfficialProjectGrade, type OfficialProjectGrade } from "@/lib/review/review.schema";

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

type RawReview = {
  id: string;
  project_id: string;
  panel_member_id: string;
  status: string;
  documentation_score: number;
  implementation_score: number;
  code_quality_score: number;
  innovation_score: number;
  presentation_score: number;
  discussion_score: number;
  total_score: number;
  draft_notes: string | null;
  draft_questions: string | null;
  draft_submitted_at: string | null;
  final_notes: string | null;
  final_submitted_at: string | null;
  updated_at: string;
  profiles:
    | { full_name: string; email: string }
    | { full_name: string; email: string }[]
    | null;
};

type RawGradeOverride = {
  id: string;
  project_id: string;
  documentation_score: number;
  implementation_score: number;
  code_quality_score: number;
  innovation_score: number;
  presentation_score: number;
  discussion_score: number;
  total_score: number;
  reason: string;
  overridden_by: string;
  created_at: string;
  is_active: boolean;
  profiles:
    | { full_name: string; email: string }
    | { full_name: string; email: string }[]
    | null;
};

export type AdminReview = Omit<RawReview, "profiles"> & {
  panel_member_name: string;
  panel_member_email: string;
};

export type GradeOverride = Omit<RawGradeOverride, "profiles"> & {
  overridden_by_name: string;
  overridden_by_email: string;
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
  reviews: AdminReview[];
  activeOverride: GradeOverride | null;
  overrideHistory: GradeOverride[];
  gradeSummary: OfficialProjectGrade;
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

function toAdminReview(review: RawReview): AdminReview {
  const profile = firstRelation(review.profiles);

  return {
    ...review,
    panel_member_name: profile?.full_name || "Unknown panel member",
    panel_member_email: profile?.email || "",
  };
}

function toGradeOverride(override: RawGradeOverride): GradeOverride {
  const profile = firstRelation(override.profiles);

  return {
    ...override,
    overridden_by_name: profile?.full_name || "Unknown admin",
    overridden_by_email: profile?.email || "",
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

  const [{ data: teamMembers }, { data: files }, assignments, { data: reviews }, { data: overrides }] = await Promise.all([
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
    supabase
      .from("reviews")
      .select("id, project_id, panel_member_id, status, documentation_score, implementation_score, code_quality_score, innovation_score, presentation_score, discussion_score, total_score, draft_notes, draft_questions, draft_submitted_at, final_notes, final_submitted_at, updated_at, profiles!reviews_panel_member_id_fkey(full_name, email)")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_grade_overrides")
      .select("id, project_id, documentation_score, implementation_score, code_quality_score, innovation_score, presentation_score, discussion_score, total_score, reason, overridden_by, created_at, is_active, profiles!project_grade_overrides_overridden_by_fkey(full_name, email)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  const row = toProjectRow(project as unknown as RawProject);
  const mappedAssignments = assignments || [];
  const mappedReviews = ((reviews || []) as unknown as RawReview[]).map(toAdminReview);
  const overrideHistory = ((overrides || []) as unknown as RawGradeOverride[]).map(toGradeOverride);
  const activeOverride = overrideHistory.find((override) => override.is_active) || null;
  const activePanelMemberIds = mappedAssignments
    .filter((assignment) => assignment.is_active && !assignment.revoked_at)
    .map((assignment) => assignment.panel_member_id);
  const gradeSummary = getOfficialProjectGrade({
    activePanelMemberIds,
    reviews: mappedReviews,
    activeOverride,
  });
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
    assignments: mappedAssignments,
    reviews: mappedReviews,
    activeOverride,
    overrideHistory,
    gradeSummary,
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
