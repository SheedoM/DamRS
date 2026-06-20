import { createSignedUrlForProjectFile } from "@/lib/project/storage";
import { getPanelDashboardStats, getPanelProjectReviewStatus, type ReviewStatus } from "@/lib/review/review.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/utils";

type ProjectRelation = {
  id: string;
  title: string;
  abstract?: string;
  status: string;
  department: string;
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
};

export type PanelReview = RawReview;

export type PanelProjectListItem = {
  id: string;
  title: string;
  status: string;
  department: string;
  supervisor_name: string;
  team_leader_name: string;
  submitted_at: string | null;
  assigned_at: string;
  reviewStatus: ReviewStatus;
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
    created_at: string;
    signedUrl: string | null;
  }[];
  reviews: PanelReview[];
};



function toProjectListItem(
  assignment: RawAssignment,
  reviews: RawReview[],
): PanelProjectListItem | null {
  const project = firstRelation(assignment.projects);
  if (!project) return null;

  const profile = firstRelation(project.profiles);
  const projectReview = reviews.find((review) => review.project_id === project.id);

  return {
    id: project.id,
    title: project.title,
    status: project.status,
    department: project.department,
    supervisor_name: project.supervisor_name,
    team_leader_name: profile?.full_name || "Unknown student",
    submitted_at: project.submitted_at,
    assigned_at: assignment.assigned_at,
    reviewStatus: getPanelProjectReviewStatus(projectReview || null),
  };
}

async function getOwnReviewsForProjects(projectIds: string[], panelMemberId: string) {
  if (projectIds.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, project_id, panel_member_id, status, documentation_score, implementation_score, code_quality_score, innovation_score, presentation_score, discussion_score, total_score, draft_notes, draft_questions, draft_submitted_at, final_notes, final_submitted_at, updated_at",
    )
    .eq("panel_member_id", panelMemberId)
    .in("project_id", projectIds);

  return (data || []) as RawReview[];
}

export async function getPanelProjects(panelMemberId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("panel_assignments")
    .select(
      "id, project_id, assigned_at, projects!inner(id, title, status, department, supervisor_name, submitted_at, profiles!projects_team_leader_id_fkey(full_name))",
    )
    .eq("panel_member_id", panelMemberId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false });

  const assignments = (data || []) as unknown as RawAssignment[];
  const projectIds = assignments.map((assignment) => assignment.project_id);
  const reviews = await getOwnReviewsForProjects(projectIds, panelMemberId);

  return assignments
    .map((assignment) => toProjectListItem(assignment, reviews))
    .filter((project): project is PanelProjectListItem => Boolean(project));
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
        "id, title, abstract, status, department, supervisor_name, technologies_used, github_url, demo_video_url, submitted_at, profiles!projects_team_leader_id_fkey(full_name)",
      )
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  if (!assignment || !project) return null;

  const [{ data: teamMembers }, { data: files }, { data: reviews }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, student_id, email, role_in_team")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_files")
      .select("id, file_type, file_name, storage_path, file_size, mime_type, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select(
        "id, project_id, panel_member_id, status, documentation_score, implementation_score, code_quality_score, innovation_score, presentation_score, discussion_score, total_score, draft_notes, draft_questions, draft_submitted_at, final_notes, final_submitted_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("panel_member_id", panelMemberId),
  ]);

  const listItem = toProjectListItem(
    {
      id: assignment.id,
      project_id: assignment.project_id,
      assigned_at: assignment.assigned_at,
      projects: project as unknown as ProjectRelation,
    },
    (reviews || []) as RawReview[],
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
    reviews: (reviews || []) as RawReview[],
  } as PanelProjectDetail;
}
