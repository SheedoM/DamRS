import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcStudentFinal } from "@/lib/review/grading";

export type ProjectStudentGrade = {
  teamMemberId: string;
  fullName: string;
  studentId: string;
  discussionSum: number; // Σ evaluators' 20-mark totals (→ 60 with three)
  evaluatorsSubmitted: number;
  firstSemester: number;
  supervision: number;
  final: number; // /100
};

export async function getProjectStudentGrades(
  projectId: string,
): Promise<ProjectStudentGrade[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: members }, { data: scores }, { data: supervision }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, student_id")
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
      discussionSum,
      evaluatorsSubmitted: discussionTotals.length,
      firstSemester: sup.firstSemester,
      supervision: sup.supervision,
      final: calcStudentFinal({
        firstSemester: sup.firstSemester,
        supervision: sup.supervision,
        discussionTotals,
      }),
    };
  });
}

export const expectedEvaluatorCountNote = "تقييم لجنة المناقشة = مجموع درجات المقيّمين (3 × 20 = 60).";
