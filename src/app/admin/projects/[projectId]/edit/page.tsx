import { notFound } from "next/navigation";

import { AdminProjectEditForm } from "../admin-project-edit-form";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminProjectEditPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { projectId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, project_number, title, title_en, supervisor_name, abstract, technologies_used, github_url, demo_video_url, leader_university_id, leader_full_name, leader_program",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("full_name, student_id, program, role_in_team")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return (
    <AppShell title="تعديل المشروع" profile={profile}>
      <AdminProjectEditForm
        project={project}
        teamMembers={(teamMembers || []).map((m) => ({
          full_name: m.full_name as string,
          student_id: m.student_id as string,
          program: (m.program as string | null) ?? null,
          role_in_team: (m.role_in_team as string) || "member",
        }))}
      />
    </AppShell>
  );
}
