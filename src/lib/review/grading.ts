import { z } from "zod";

// The dean's discussion form: 5 criteria, 20 marks, per student, per evaluator.
export const discussionCriteria = [
  { key: "project_document", label: "مستند المشروع", max: 5 },
  { key: "presentation_quality", label: "جودة العرض التقديمي", max: 5 },
  { key: "scientific_mastery", label: "التمكن العلمي والإجابة على الأسئلة", max: 5 },
  { key: "feasibility", label: "مدى إمكانية تطبيق المشروع", max: 3 },
  { key: "competition", label: "الاشتراك في المسابقات", max: 2 },
] as const;

export type DiscussionCriterionKey = (typeof discussionCriteria)[number]["key"];

export const DISCUSSION_MAX = 20; // 5 + 5 + 5 + 3 + 2
export const FIRST_SEMESTER_MAX = 10;
export const SUPERVISION_MAX = 30;

export type CycleTerm = "first" | "second";

// Each cycle is one term, graded independently:
//   second term: discussion 60 + أعمال السنة 30 = /90
//   first  term: أعمال الفصل only             = /10
export const SECOND_TERM_MAX = 90;
export const FIRST_TERM_MAX = 10;

export function termMax(term: CycleTerm): number {
  return term === "first" ? FIRST_TERM_MAX : SECOND_TERM_MAX;
}

export type DiscussionScores = Record<DiscussionCriterionKey, number>;

const criterionSchema = (label: string, max: number) =>
  z.coerce
    .number()
    .min(0, `${label} لا يمكن أن تقل عن 0.`)
    .max(max, `${label} لا يمكن أن تتجاوز ${max}.`);

export const discussionScoreSchema = z.object(
  Object.fromEntries(
    discussionCriteria.map((criterion) => [
      criterion.key,
      criterionSchema(criterion.label, criterion.max),
    ]),
  ) as Record<DiscussionCriterionKey, ReturnType<typeof criterionSchema>>,
);

export type DiscussionScoreValues = z.infer<typeof discussionScoreSchema>;

export const studentGradesSchema = z.object({
  first_semester_score: criterionSchema("درجة الفصل الأول", FIRST_SEMESTER_MAX),
  supervision_score: criterionSchema("تقييم لجنة الإشراف", SUPERVISION_MAX),
});

export type StudentGradesValues = z.infer<typeof studentGradesSchema>;

function round2(value: number) {
  return Number(value.toFixed(2));
}

export function calcDiscussionTotal(scores: Partial<DiscussionScores>): number {
  return round2(
    discussionCriteria.reduce((sum, criterion) => sum + Number(scores[criterion.key] ?? 0), 0),
  );
}

// Per-student final, term-aware:
//   second term (/90): SUM of evaluators' 20-mark discussion totals + supervision (30)
//   first  term (/10): first-semester only
export function calcStudentFinal({
  term,
  firstSemester,
  supervision,
  discussionTotals,
}: {
  term: CycleTerm;
  firstSemester: number | null | undefined;
  supervision: number | null | undefined;
  discussionTotals: number[];
}): number {
  if (term === "first") {
    return round2(Number(firstSemester || 0));
  }
  const discussionSum = discussionTotals.reduce((sum, total) => sum + Number(total || 0), 0);
  return round2(Number(supervision || 0) + discussionSum);
}

export type StudentGradeSummary = {
  teamMemberId: string;
  discussionSum: number; // out of 60 with three evaluators (second term)
  evaluatorsSubmitted: number;
  evaluatorsRequired: number;
  firstSemester: number;
  supervision: number;
  final: number; // out of termMax(term)
};
