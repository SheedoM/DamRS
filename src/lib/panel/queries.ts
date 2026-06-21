import { createSignedUrlForProjectFile } from "@/lib/project/storage";
import { getPanelDashboardStats } from "./panel-projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/utils";

type ProjectRelation = {
  id: string;
  title: string;
  abstract?: string;
  status: string;
  department?: string | null;
  supervisor_name: string;
  technologies_used?: string | null;
  github_url?: string | null;
  demo_video_url?: string | null;
  submitted_at: string | null;
  profiles?: { full_name: string } | { full_name: string }[] | null;
};

type RawAssignment = {
  id: string;
  project_id: string;
  assigned_at: string;
  projects: ProjectRelation | ProjectRelation[] | null;
};

export type PanelProjectListItem = {
  id: string;
  title: string;
  status: string;
  supervisor_name: string;
  team_leader_name: string;
  submitted_at: string | null;
  assigned_at: string;
  graded: boolean;
};

export type PanelProjectDetail = PanelProjectListItem & {
  abstract: string;
  technologies_used: string | null;
  github_url: string | null;
  demo_video_url: string | null;
  team_members: {
    id: string;
    full_name: string;
    student_id: string;
    national_id: string | null;
    program: string | null;
    role_in_team: string;
  }[];
  files: {
    id: string;
    file_type: string;
    file_name: string;
    storage_path: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    signedUrl: string | null;
  }[];
};



function toProjectListItem(
  assignment: RawAssignment,
  gradedProjectIds: Set<string>,
): PanelProjectListItem | null {
  const project = firstRelation(assignment.projects);
  if (!project) return null;

  const profile = firstRelation(project.profiles);

  return {
    id: project.id,
    title: project.title,
    status: project.status,
    supervisor_name: project.supervisor_name,
    team_leader_name: profile?.full_name || "طالب غير معروف",
    submitted_at: project.submitted_at,
    assigned_at: assignment.assigned_at,
    graded: gradedProjectIds.has(project.id),
  };
}

// A project is "graded" by this evaluator once they've saved any student score.
async function getGradedProjectIds(projectIds: string[], panelMemberId: string) {
  if (projectIds.length === 0) return new Set<string>();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("student_discussion_scores")
    .select("project_id")
    .eq("panel_member_id", panelMemberId)
    .in("project_id", projectIds);

  return new Set((data || []).map((row) => row.project_id as string));
}

export async function getPanelProjects(panelMemberId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select(
      "id, project_id, assigned_at, projects!inner(id, title, status, supervisor_name, submitted_at, profiles!projects_team_leader_id_fkey(full_name))",
    )
    .eq("panel_member_id", panelMemberId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false });

  const assignments = (data || []) as unknown as RawAssignment[];
  const projectIds = assignments.map((assignment) => assignment.project_id);
  const gradedProjectIds = await getGradedProjectIds(projectIds, panelMemberId);

  return assignments
    .map((assignment) => toProjectListItem(assignment, gradedProjectIds))
    .filter((project): project is PanelProjectListItem => Boolean(project));
}

export type OwnDiscussionScore = {
  team_member_id: string;
  project_document: number;
  presentation_quality: number;
  scientific_mastery: number;
  feasibility: number;
  competition: number;
};

export async function getOwnDiscussionScores(
  projectId: string,
  panelMemberId: string,
): Promise<OwnDiscussionScore[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("student_discussion_scores")
    .select("team_member_id, project_document, presentation_quality, scientific_mastery, feasibility, competition")
    .eq("project_id", projectId)
    .eq("panel_member_id", panelMemberId);

  return (data || []) as OwnDiscussionScore[];
}

export async function getActiveCycleGradingState(): Promise<{
  isOpen: boolean;
  allowEditAfterFinal: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  // Resolve the active cycle first (robust even if more than one is active),
  // then read its grading window — avoids a multi-row failure forcing "closed".
  const { data: cycle } = await supabase
    .from("discussion_cycles")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return { isOpen: false, allowEditAfterFinal: false };
  }

  const { data } = await supabase
    .from("grading_windows")
    .select("is_open, allow_edit_after_final")
    .eq("cycle_id", cycle.id)
    .maybeSingle();

  return {
    isOpen: Boolean(data?.is_open),
    allowEditAfterFinal: Boolean(data?.allow_edit_after_final),
  };
}

export async function isActiveCycleGradingOpen(): Promise<boolean> {
  const { isOpen } = await getActiveCycleGradingState();
  return isOpen;
}

export async function getPanelDashboardData(panelMemberId: string) {
  const projects = await getPanelProjects(panelMemberId);

  return {
    projects,
    stats: getPanelDashboardStats(projects),
  };
}

export async function getPanelProjectDetail(projectId: string, panelMemberId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: assignment }, { data: project }] = await Promise.all([
    supabase
      .from("panel_assignments")
      .select("id, project_id, assigned_at")
      .eq("project_id", projectId)
      .eq("panel_member_id", panelMemberId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle(),
    supabase
      .from("projects")
      .select(
        "id, title, abstract, status, supervisor_name, technologies_used, github_url, demo_video_url, submitted_at, profiles!projects_team_leader_id_fkey(full_name)",
      )
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  if (!assignment || !project) return null;

  const [{ data: teamMembers }, { data: files }, gradedProjectIds] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, student_id, national_id, program, role_in_team")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_files")
      .select("id, file_type, file_name, storage_path, file_size, mime_type, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    getGradedProjectIds([projectId], panelMemberId),
  ]);

  const listItem = toProjectListItem(
    {
      id: assignment.id,
      project_id: assignment.project_id,
      assigned_at: assignment.assigned_at,
      projects: project as unknown as ProjectRelation,
    },
    gradedProjectIds,
  );

  if (!listItem) return null;

  const filesWithSignedUrls = await Promise.all(
    (files || []).map(async (file) => ({
      ...file,
      signedUrl: await createSignedUrlForProjectFile(supabase, file),
    })),
  );

  return {
    ...listItem,
    abstract: String(project.abstract || ""),
    technologies_used: project.technologies_used as string | null,
    github_url: project.github_url as string | null,
    demo_video_url: project.demo_video_url as string | null,
    team_members: teamMembers || [],
    files: filesWithSignedUrls,
  } as PanelProjectDetail;
}
