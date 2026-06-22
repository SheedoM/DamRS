import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedUrlForProjectFile } from "@/lib/project/storage";

export type StudentProject = {
  id: string;
  cycle_id: string;
  project_number: string | null;
  title: string | null;
  title_en: string | null;
  abstract: string | null;
  supervisor_name: string | null;
  technologies_used: string | null;
  github_url: string | null;
  demo_video_url: string | null;
  source_code_url: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  full_name: string;
  student_id: string;
  national_id: string | null;
  program: string | null;
  role_in_team: string;
};

export type ProjectFile = {
  id: string;
  file_type: string;
  file_name: string;
  note: string | null;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  signedUrl: string | null;
};

export type SubmissionWindow = {
  id: string;
  cycle_id: string;
  opens_at: string;
  closes_at: string;
  allow_late_submission: boolean;
  allow_edit_after_submit: boolean;
};

export async function getActiveSubmissionWindow() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("submission_windows")
    .select("id, cycle_id, opens_at, closes_at, allow_late_submission, allow_edit_after_submit, discussion_cycles!inner(name, is_active)")
    .eq("discussion_cycles.is_active", true)
    .limit(1)
    .maybeSingle();

  return data as SubmissionWindow | null;
}

export async function getStudentProject(teamLeaderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, cycle_id, project_number, title, title_en, abstract, supervisor_name, technologies_used, github_url, demo_video_url, source_code_url, status, submitted_at, created_at, updated_at",
    )
    .eq("team_leader_id", teamLeaderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!project) {
    return null;
  }

  const [{ data: teamMembers }, { data: files }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, student_id, national_id, program, role_in_team")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_files")
      .select("id, file_type, file_name, note, storage_path, file_size, mime_type, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  const filesWithSignedUrls = await Promise.all(
    (files || []).map(async (file) => ({
      ...file,
      signedUrl: await createSignedUrlForProjectFile(supabase, file),
    })),
  );

  return {
    project: project as StudentProject,
    teamMembers: (teamMembers || []) as TeamMember[],
    files: filesWithSignedUrls as ProjectFile[],
  };
}
