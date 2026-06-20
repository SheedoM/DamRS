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
export const FINAL_MAX = 100;

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

// Per-student final out of 100 = first semester (10) + supervision (30)
// + SUM of every evaluator's 20-mark discussion total.
export function calcStudentFinal({
  firstSemester,
  supervision,
  discussionTotals,
}: {
  firstSemester: number | null | undefined;
  supervision: number | null | undefined;
  discussionTotals: number[];
}): number {
  const discussionSum = discussionTotals.reduce((sum, total) => sum + Number(total || 0), 0);
  return round2(Number(firstSemester || 0) + Number(supervision || 0) + discussionSum);
}

export type StudentGradeSummary = {
  teamMemberId: string;
  discussionSum: number; // out of 60 with three evaluators
  evaluatorsSubmitted: number;
  evaluatorsRequired: number;
  firstSemester: number;
  supervision: number;
  final: number; // out of 100
};
