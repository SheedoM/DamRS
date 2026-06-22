import { createSignedUrlForProjectFile } from "@/lib/project/storage";
import { getPanelDashboardStats, type PanelProjectGradingState } from "./panel-projects";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  source_code_url?: string | null;
  submitted_at: string | null;
  profiles?: { full_name: string } | { full_name: string }[] | null;
};

type RawAssignment = {
  id: string;
  project_id: string;
  assigned_at: string;
  finalized_at: string | null;
  role?: string;
  projects: ProjectRelation | ProjectRelation[] | null;
};

export type PanelRoles = { committee: boolean; supervisor: boolean };

export type PanelProjectListItem = {
  id: string;
  title: string;
  status: string;
  supervisor_name: string;
  team_leader_name: string;
  submitted_at: string | null;
  assigned_at: string;
  gradingState: PanelProjectGradingState;
  roles: PanelRoles;
};

export type SupervisionEntry = {
  team_member_id: string;
  first_semester_score: number;
  supervision_score: number;
};

export type PanelProjectDetail = PanelProjectListItem & {
  abstract: string;
  technologies_used: string | null;
  github_url: string | null;
  demo_video_url: string | null;
  source_code_url: string | null;
  finalized: { committee: boolean; supervisor: boolean };
  term: "first" | "second";
  supervision: SupervisionEntry[];
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
  gradingState: PanelProjectGradingState,
  roles: PanelRoles,
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
    gradingState,
    roles,
  };
}

// Use the service-role client because discussion score reads are RLS-gated to
// the open grading window, while the panel list still needs saved-draft state.
async function getMemberScoredProjectIds(
  projectIds: string[],
  panelMemberId: string,
  supervisorProjectIds: string[],
) {
  if (projectIds.length === 0) return new Set<string>();

  const supabase = createSupabaseAdminClient();
  const [discussionResult, supervisionResult] = await Promise.all([
    supabase
      .from("student_discussion_scores")
      .select("project_id")
      .eq("panel_member_id", panelMemberId)
      .in("project_id", projectIds),
    supervisorProjectIds.length > 0
      ? supabase
          .from("student_supervision_grades")
          .select("project_id")
          .in("project_id", supervisorProjectIds)
      : Promise.resolve({ data: [] }),
  ]);

  const scoredProjectIds = new Set<string>();
  for (const row of discussionResult.data || []) {
    scoredProjectIds.add(row.project_id as string);
  }
  for (const row of supervisionResult.data || []) {
    scoredProjectIds.add(row.project_id as string);
  }

  return scoredProjectIds;
}

function deriveGradingState({
  hasScores,
  finalizedAssignments,
  totalAssignments,
}: {
  hasScores: boolean;
  finalizedAssignments: number;
  totalAssignments: number;
}): PanelProjectGradingState {
  if (totalAssignments > 0 && finalizedAssignments === totalAssignments) {
    return "final";
  }
  return hasScores ? "draft" : "none";
}

export async function getPanelProjects(panelMemberId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select(
      "id, project_id, assigned_at, finalized_at, role, projects(id, title, status, supervisor_name, submitted_at, profiles!projects_team_leader_id_fkey(full_name))",
    )
    .eq("panel_member_id", panelMemberId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false });

  const assignments = (data || []) as unknown as RawAssignment[];
  // A member can have both a committee and a supervisor assignment on one
  // project — collapse to a single row with the combined roles.
  const byProject = new Map<string, {
    assignment: RawAssignment;
    roles: PanelRoles;
    totalAssignments: number;
    finalizedAssignments: number;
  }>();
  for (const a of assignments) {
    const entry = byProject.get(a.project_id) || {
      assignment: a,
      roles: { committee: false, supervisor: false },
      totalAssignments: 0,
      finalizedAssignments: 0,
    };
    if (a.role === "supervisor") entry.roles.supervisor = true;
    else entry.roles.committee = true;
    entry.totalAssignments += 1;
    if (a.finalized_at) entry.finalizedAssignments += 1;
    byProject.set(a.project_id, entry);
  }

  const projectIds = [...byProject.keys()];
  const supervisorProjectIds = [...byProject.entries()]
    .filter(([, entry]) => entry.roles.supervisor)
    .map(([projectId]) => projectId);
  const scoredProjectIds = await getMemberScoredProjectIds(projectIds, panelMemberId, supervisorProjectIds);

  return [...byProject.values()]
    .map(({ assignment, roles, totalAssignments, finalizedAssignments }) =>
      toProjectListItem(
        assignment,
        deriveGradingState({
          hasScores: scoredProjectIds.has(assignment.project_id),
          finalizedAssignments,
          totalAssignments,
        }),
        roles,
      ),
    )
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

function termOf(rel: { term?: string } | { term?: string }[] | null | undefined): "first" | "second" {
  const c = Array.isArray(rel) ? rel[0] : rel;
  return c?.term === "first" ? "first" : "second";
}

export async function getPanelProjectDetail(projectId: string, panelMemberId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: assignments }, { data: project }] = await Promise.all([
    supabase
      .from("panel_assignments")
      .select("id, project_id, assigned_at, finalized_at, role")
      .eq("project_id", projectId)
      .eq("panel_member_id", panelMemberId)
      .eq("is_active", true)
      .is("revoked_at", null),
    supabase
      .from("projects")
      .select(
        "id, title, abstract, status, supervisor_name, technologies_used, github_url, demo_video_url, source_code_url, submitted_at, discussion_cycles(term), profiles!projects_team_leader_id_fkey(full_name)",
      )
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  const assignmentRows = (assignments || []) as { id: string; project_id: string; assigned_at: string; finalized_at: string | null; role: string }[];
  if (assignmentRows.length === 0 || !project) return null;

  const roles: PanelRoles = {
    committee: assignmentRows.some((a) => a.role !== "supervisor"),
    supervisor: assignmentRows.some((a) => a.role === "supervisor"),
  };

  const [{ data: teamMembers }, { data: files }, { data: supervision }, scoredProjectIds] = await Promise.all([
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
    roles.supervisor
      ? supabase
          .from("student_supervision_grades")
          .select("team_member_id, first_semester_score, supervision_score")
          .eq("project_id", projectId)
      : Promise.resolve({ data: [] as SupervisionEntry[] }),
    getMemberScoredProjectIds([projectId], panelMemberId, roles.supervisor ? [projectId] : []),
  ]);

  const listItem = toProjectListItem(
    {
      id: assignmentRows[0].id,
      project_id: assignmentRows[0].project_id,
      assigned_at: assignmentRows[0].assigned_at,
      finalized_at: assignmentRows[0].finalized_at,
      projects: project as unknown as ProjectRelation,
    },
    deriveGradingState({
      hasScores: scoredProjectIds.has(projectId),
      finalizedAssignments: assignmentRows.filter((assignment) => assignment.finalized_at).length,
      totalAssignments: assignmentRows.length,
    }),
    roles,
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
    source_code_url: project.source_code_url as string | null,
    finalized: {
      committee: assignmentRows.some((assignment) => assignment.role !== "supervisor" && Boolean(assignment.finalized_at)),
      supervisor: assignmentRows.some((assignment) => assignment.role === "supervisor" && Boolean(assignment.finalized_at)),
    },
    term: termOf((project as { discussion_cycles?: { term?: string } | { term?: string }[] }).discussion_cycles),
    supervision: (supervision || []).map((s) => ({
      team_member_id: s.team_member_id as string,
      first_semester_score: Number(s.first_semester_score),
      supervision_score: Number(s.supervision_score),
    })),
    team_members: teamMembers || [],
    files: filesWithSignedUrls,
  } as PanelProjectDetail;
}
