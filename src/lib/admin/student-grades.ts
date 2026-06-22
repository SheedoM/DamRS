import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcStudentFinal, type CycleTerm } from "@/lib/review/grading";

export type ProjectStudentGrade = {
  teamMemberId: string;
  fullName: string;
  studentId: string;
  program: string | null;
  isLeader: boolean;
  discussionSum: number; // Σ evaluators' 20-mark totals (→ 60 with three)
  evaluatorsSubmitted: number;
  firstSemester: number;
  supervision: number;
  final: number; // /termMax(term)
};

export async function getProjectTerm(projectId: string): Promise<CycleTerm> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("projects")
    .select("discussion_cycles(term)")
    .eq("id", projectId)
    .maybeSingle();
  const rel = (data as { discussion_cycles?: { term?: string } | { term?: string }[] } | null)
    ?.discussion_cycles;
  const cycle = Array.isArray(rel) ? rel[0] : rel;
  return cycle?.term === "first" ? "first" : "second";
}

export async function getProjectStudentGrades(
  projectId: string,
): Promise<ProjectStudentGrade[]> {
  const supabase = await createSupabaseServerClient();
  const term = await getProjectTerm(projectId);

  const [{ data: members }, { data: scores }, { data: supervision }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, student_id, program, role_in_team")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("student_discussion_scores")
      .select("team_member_id, total")
      .eq("project_id", projectId),
    supabase
      .from("student_supervision_grades")
      .select("team_member_id, first_semester_score, supervision_score")
      .eq("project_id", projectId),
  ]);

  const discussionByMember = new Map<string, number[]>();
  for (const row of scores || []) {
    const id = row.team_member_id as string;
    const list = discussionByMember.get(id) || [];
    list.push(Number(row.total));
    discussionByMember.set(id, list);
  }

  const supervisionByMember = new Map(
    (supervision || []).map((row) => [
      row.team_member_id as string,
      {
        firstSemester: Number(row.first_semester_score),
        supervision: Number(row.supervision_score),
      },
    ]),
  );

  return (members || []).map((member) => {
    const id = member.id as string;
    const discussionTotals = discussionByMember.get(id) || [];
    const sup = supervisionByMember.get(id) || { firstSemester: 0, supervision: 0 };
    const discussionSum = Number(discussionTotals.reduce((a, b) => a + b, 0).toFixed(2));

    return {
      teamMemberId: id,
      fullName: member.full_name as string,
      studentId: member.student_id as string,
      program: (member.program as string | null) ?? null,
      isLeader: member.role_in_team === "team_leader",
      discussionSum,
      evaluatorsSubmitted: discussionTotals.length,
      firstSemester: sup.firstSemester,
      supervision: sup.supervision,
      final: calcStudentFinal({
        term,
        firstSemester: sup.firstSemester,
        supervision: sup.supervision,
        discussionTotals,
      }),
    };
  });
}

export const expectedEvaluatorCountNote = "تقييم لجنة المناقشة = مجموع درجات المقيّمين (3 × 20 = 60).";

// --- Per-evaluator breakdown (admin view + override) -----------------------

export type EvaluatorScore = {
  panelMemberId: string;
  name: string;
  project_document: number;
  presentation_quality: number;
  scientific_mastery: number;
  feasibility: number;
  competition: number;
  total: number;
  hasScore: boolean;
};

export type StudentBreakdown = {
  teamMemberId: string;
  fullName: string;
  studentId: string;
  isLeader: boolean;
  evaluators: EvaluatorScore[];
};

export async function getProjectGradingBreakdown(projectId: string): Promise<StudentBreakdown[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: assignments }, { data: members }, { data: scores }] = await Promise.all([
    supabase
      .from("panel_assignments")
      .select("panel_member_id, profiles!panel_assignments_panel_member_id_fkey(full_name)")
      .eq("project_id", projectId)
      .eq("role", "committee")
      .eq("is_active", true)
      .is("revoked_at", null),
    supabase
      .from("team_members")
      .select("id, full_name, student_id, role_in_team")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("student_discussion_scores")
      .select("panel_member_id, team_member_id, project_document, presentation_quality, scientific_mastery, feasibility, competition, total")
      .eq("project_id", projectId),
  ]);

  // Unique committee evaluators (by panel member), with display name.
  const evaluators = new Map<string, string>();
  for (const a of (assignments || []) as { panel_member_id: string; profiles?: { full_name?: string } | { full_name?: string }[] }[]) {
    const prof = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    evaluators.set(a.panel_member_id, prof?.full_name || "عضو لجنة");
  }

  const scoreByKey = new Map<string, Record<string, number>>();
  for (const s of scores || []) {
    scoreByKey.set(`${s.panel_member_id}|${s.team_member_id}`, s as unknown as Record<string, number>);
  }

  return (members || []).map((m) => ({
    teamMemberId: m.id as string,
    fullName: m.full_name as string,
    studentId: m.student_id as string,
    isLeader: m.role_in_team === "team_leader",
    evaluators: [...evaluators.entries()].map(([panelMemberId, name]) => {
      const s = scoreByKey.get(`${panelMemberId}|${m.id}`);
      return {
        panelMemberId,
        name,
        project_document: Number(s?.project_document ?? 0),
        presentation_quality: Number(s?.presentation_quality ?? 0),
        scientific_mastery: Number(s?.scientific_mastery ?? 0),
        feasibility: Number(s?.feasibility ?? 0),
        competition: Number(s?.competition ?? 0),
        total: Number(s?.total ?? 0),
        hasScore: Boolean(s),
      };
    }),
  }));
}
