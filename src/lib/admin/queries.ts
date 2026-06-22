import { getGradingProgress, type AdminProjectRow } from "./admin-projects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedUrlForProjectFile } from "@/lib/project/storage";
import { firstRelation } from "@/lib/utils";

export type PanelMember = {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  panel_member_type: string | null;
  temp_password?: string | null;
};


export type Assignment = {
  /** Primary assignment id (first row when a person holds multiple roles). */
  id: string;
  /** All assignment row ids for this person on this project (for bulk-revoke). */
  ids: string[];
  project_id: string;
  panel_member_id: string;
  assigned_at: string;
  revoked_at: string | null;
  is_active: boolean;
  panel_member_name: string;
  panel_member_email: string;
  panel_member_type: string | null;
  project_title: string;
  /** Collapsed roles this member holds on this project. */
  roles: { committee: boolean; supervisor: boolean };
};

type RawAssignment = {
  id: string;
  project_id: string;
  panel_member_id: string;
  assigned_at: string;
  revoked_at: string | null;
  is_active: boolean;
  role: string | null;
  profiles:
    | { full_name: string; email: string; panel_member_type: string | null }
    | { full_name: string; email: string; panel_member_type: string | null }[]
    | null;
  projects: { title: string } | { title: string }[] | null;
};

export type AdminProjectDetail = AdminProjectRow & {
  abstract: string;
  technologies_used: string | null;
  github_url: string | null;
  demo_video_url: string | null;
  source_code_url: string | null;
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
    signedUrl: string | null;
  }[];
  assignments: Assignment[];
};

type RawProject = {
  id: string;
  project_number: string | null;
  title: string | null;
  title_en: string | null;
  status: string;
  department: string | null;
  supervisor_name: string | null;
  submitted_at: string | null;
  team_leader_id: string | null;
  leader_full_name: string | null;
  profiles: { full_name: string; student_id: string | null } | null;
  panel_assignments: { panel_member_id: string }[] | null;
  team_members: { id: string }[] | null;
  student_discussion_scores: { panel_member_id: string; team_member_id: string }[] | null;
  student_supervision_grades: { team_member_id: string }[] | null;
};

function toProjectRow(project: RawProject): AdminProjectRow {
  const activePanelMemberIds = (project.panel_assignments || []).map((assignment) => assignment.panel_member_id);
  const activePanelSet = new Set(activePanelMemberIds);
  const teamMemberCount = (project.team_members || []).length;
  // Only count discussion scores from currently-active evaluators.
  const discussionCompleted = (project.student_discussion_scores || []).filter((score) =>
    activePanelSet.has(score.panel_member_id),
  ).length;
  const supervisionCompleted = (project.student_supervision_grades || []).length;

  const counts = {
    discussion_required_count: activePanelMemberIds.length * teamMemberCount,
    discussion_completed_count: discussionCompleted,
    supervision_required_count: teamMemberCount,
    supervision_completed_count: supervisionCompleted,
  };

  const awaitingLeader = !project.team_leader_id;

  return {
    id: project.id,
    project_number: project.project_number,
    title: project.title || "",
    title_en: project.title_en,
    status: project.status,
    awaiting_leader: awaitingLeader,
    department: project.department || "",
    supervisor_name: project.supervisor_name || "",
    team_leader_name:
      project.profiles?.full_name || project.leader_full_name || "بانتظار تسجيل القائد",
    team_leader_student_id: project.profiles?.student_id ?? null,
    active_assignment_count: activePanelMemberIds.length,
    team_member_count: teamMemberCount,
    ...counts,
    grading_status: getGradingProgress(counts),
    submitted_at: project.submitted_at,
  };
}



function toAssignment(assignment: RawAssignment): Assignment {
  const profile = firstRelation(assignment.profiles);
  const project = firstRelation(assignment.projects);

  return {
    id: assignment.id,
    ids: [assignment.id],
    project_id: assignment.project_id,
    panel_member_id: assignment.panel_member_id,
    assigned_at: assignment.assigned_at,
    revoked_at: assignment.revoked_at,
    is_active: assignment.is_active,
    panel_member_name: profile?.full_name || "عضو لجنة غير معروف",
    panel_member_email: profile?.email || "",
    panel_member_type: profile?.panel_member_type ?? null,
    project_title: project?.title || "مشروع غير معروف",
    roles: {
      committee: assignment.role !== "supervisor",
      supervisor: assignment.role === "supervisor",
    },
  };
}

/**
 * Collapse multiple assignment rows for the same panel member (one per role)
 * into a single Assignment entry with combined roles.
 */
function collapseByMember(assignments: Assignment[]): Assignment[] {
  const byMember = new Map<string, Assignment>();
  for (const a of assignments) {
    const existing = byMember.get(a.panel_member_id);
    if (!existing) {
      byMember.set(a.panel_member_id, { ...a });
    } else {
      existing.ids.push(...a.ids);
      existing.roles.committee = existing.roles.committee || a.roles.committee;
      existing.roles.supervisor = existing.roles.supervisor || a.roles.supervisor;
    }
  }
  return [...byMember.values()];
}

const PROJECT_ROW_SELECT =
  "id, project_number, title, title_en, status, department, supervisor_name, submitted_at, team_leader_id, leader_full_name, profiles!projects_team_leader_id_fkey(full_name, student_id), panel_assignments!left(panel_member_id), team_members(id), student_discussion_scores(panel_member_id, team_member_id), student_supervision_grades(team_member_id)";

export async function getAdminProjects() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select(PROJECT_ROW_SELECT)
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
      "id, project_number, title, title_en, abstract, status, department, supervisor_name, technologies_used, github_url, demo_video_url, source_code_url, submitted_at, team_leader_id, leader_full_name, profiles!projects_team_leader_id_fkey(full_name), panel_assignments!left(panel_member_id), team_members(id), student_discussion_scores(panel_member_id, team_member_id), student_supervision_grades(team_member_id)",
    )
    .is("panel_assignments.revoked_at", null)
    .eq("panel_assignments.is_active", true)
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return null;

  const [{ data: teamMembers }, { data: files }, assignments] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, student_id, national_id, program, role_in_team")
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
  const mappedAssignments = assignments || [];
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
    source_code_url: project.source_code_url as string | null,
    team_members: teamMembers || [],
    files: filesWithSignedUrls,
    assignments: mappedAssignments,
  } as AdminProjectDetail;
}

export async function getPanelMembers() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, department, panel_member_type, temp_password")
    .eq("role", "panel_member")
    .order("full_name", { ascending: true });

  return (data || []) as PanelMember[];
}

export async function getAssignmentsForProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select("id, project_id, panel_member_id, assigned_at, revoked_at, is_active, role, profiles!panel_assignments_panel_member_id_fkey(full_name, email, panel_member_type), projects(title)")
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: false });

  const raw = ((data || []) as unknown as RawAssignment[]).map(toAssignment);
  return collapseByMember(raw);
}

export async function getAllAssignments() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select("id, project_id, panel_member_id, assigned_at, revoked_at, is_active, profiles!panel_assignments_panel_member_id_fkey(full_name, email, panel_member_type), projects(title)")
    .order("assigned_at", { ascending: false });

  return ((data || []) as unknown as RawAssignment[]).map(toAssignment);
}

export async function getSubmissionWindow() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("submission_windows")
    .select("id, cycle_id, opens_at, closes_at, allow_late_submission, allow_edit_after_submit, discussion_cycles!inner(id, name, is_active, term)")
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
      | { id: string; name: string; is_active: boolean; term?: string }
      | { id: string; name: string; is_active: boolean; term?: string }[]
      | null;
  };

  return {
    ...raw,
    discussion_cycles: Array.isArray(raw.discussion_cycles)
      ? raw.discussion_cycles[0] || null
      : raw.discussion_cycles,
  };
}
