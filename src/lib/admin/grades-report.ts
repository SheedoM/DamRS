import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcStudentFinal, type CycleTerm } from "@/lib/review/grading";
import { programLabel } from "@/lib/i18n/labels";

function termOf(rel: { term?: string } | { term?: string }[] | null | undefined): CycleTerm {
  const c = Array.isArray(rel) ? rel[0] : rel;
  return c?.term === "first" ? "first" : "second";
}

export type GradesReportRow = {
  studentName: string;
  universityId: string;
  nationalId: string;
  program: string;
  project: string;
  supervisor: string;
  firstSemester: string;
  supervision: string;
  discussionSum: string;
  final: string;
};

type RawProject = {
  id: string;
  title: string;
  supervisor_name: string;
  discussion_cycles?: { term?: string } | { term?: string }[] | null;
};

type RawMember = {
  id: string;
  project_id: string;
  full_name: string;
  student_id: string | null;
  national_id: string | null;
  program: string | null;
};

export async function getGradesReportRows(): Promise<GradesReportRow[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: projects }, { data: members }, { data: scores }, { data: supervision }] =
    await Promise.all([
      supabase.from("projects").select("id, title, supervisor_name, discussion_cycles(term)").order("created_at"),
      supabase.from("team_members").select("id, project_id, full_name, student_id, national_id, program"),
      supabase.from("student_discussion_scores").select("team_member_id, total"),
      supabase
        .from("student_supervision_grades")
        .select("team_member_id, first_semester_score, supervision_score"),
    ]);

  const projectById = new Map((projects || []).map((p) => [p.id as string, p as RawProject]));

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

  return ((members || []) as RawMember[]).map((member) => {
    const project = projectById.get(member.project_id);
    const discussionTotals = discussionByMember.get(member.id) || [];
    const sup = supervisionByMember.get(member.id) || { firstSemester: 0, supervision: 0 };
    const discussionSum = Number(discussionTotals.reduce((a, b) => a + b, 0).toFixed(2));
    const final = calcStudentFinal({
      term: termOf(project?.discussion_cycles),
      firstSemester: sup.firstSemester,
      supervision: sup.supervision,
      discussionTotals,
    });

    return {
      studentName: member.full_name,
      universityId: member.student_id || "—",
      nationalId: member.national_id || "—",
      program: programLabel(member.program ?? null),
      project: project?.title || "—",
      supervisor: project?.supervisor_name || "—",
      firstSemester: String(sup.firstSemester),
      supervision: String(sup.supervision),
      discussionSum: String(discussionSum),
      final: String(final),
    };
  });
}

const CSV_HEADERS = [
  "اسم الطالب",
  "الرقم الجامعي",
  "الرقم القومي",
  "البرنامج",
  "المشروع",
  "المشرف",
  "الفصل الأول (10)",
  "الإشراف (30)",
  "المناقشة (60)",
  "الدرجة النهائية",
];

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildGradesCsv(rows: GradesReportRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.studentName,
        row.universityId,
        row.nationalId,
        row.program,
        row.project,
        row.supervisor,
        row.firstSemester,
        row.supervision,
        row.discussionSum,
        row.final,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // UTF-8 BOM so Excel renders Arabic correctly.
  return "﻿" + lines.join("\r\n");
}
