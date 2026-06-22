// Central Arabic label maps. The app is Arabic-only (RTL); enum values stay in
// English in the database and are mapped to Arabic for display here.

export const programValues = [
  "information_systems",
  "computer_science",
  "information_technology",
  "medical_informatics",
  "artificial_intelligence",
  "cybersecurity",
] as const;

export type ProgramValue = (typeof programValues)[number];

export const programLabels: Record<ProgramValue, string> = {
  information_systems: "نظم المعلومات",
  computer_science: "علوم الحاسب",
  information_technology: "تكنولوجيا المعلومات",
  medical_informatics: "المعلوماتية الطبية",
  artificial_intelligence: "الذكاء الاصطناعي",
  cybersecurity: "الأمن السيبراني",
};

export const programOptions = programValues.map((value) => ({
  value,
  label: programLabels[value],
}));

// Per-assignment role on a project (panel_assignments.role). This is the single
// source of truth for a person's role — it is the hat they wear on a specific
// project, chosen by the admin at assignment time. A panel member can be a
// supervisor on one project and a committee head on another. A committee head
// grades like a committee member (label-only); only 'supervisor' changes the form.
export const assignmentRoleValues = ["committee", "committee_head", "supervisor"] as const;

export type AssignmentRoleValue = (typeof assignmentRoleValues)[number];

export const assignmentRoleLabels: Record<AssignmentRoleValue, string> = {
  committee: "عضو",
  committee_head: "رئيس اللجنة",
  supervisor: "مشرف",
};

export const assignmentRoleOptions = assignmentRoleValues.map((value) => ({
  value,
  label: assignmentRoleLabels[value],
}));

export function assignmentRoleLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return assignmentRoleLabels[value as AssignmentRoleValue] ?? value;
}

export const userRoleLabels: Record<string, string> = {
  admin: "مسؤول",
  student: "طالب",
  panel_member: "عضو لجنة",
};

export const projectStatusLabels: Record<string, string> = {
  draft: "مسودة",
  submitted: "تم التسليم",
  assigned: "تم التعيين",
  draft_reviewed: "مراجعة مبدئية",
  final_reviewed: "مراجعة نهائية",
  completed: "مكتمل",
};

export const gradingStatusLabels: Record<string, string> = {
  not_graded: "لم يُقيَّم",
  partial: "قيد التقييم",
  graded: "مكتمل التقييم",
};

export const projectFileTypeLabels: Record<string, string> = {
  documentation_pdf: "مستند المشروع (PDF)",
  source_code_zip: "الكود المصدري (ZIP)",
  presentation_file: "ملف العرض التقديمي",
  competition_proof: "إثبات اشتراك في مسابقة",
  extra_attachment: "مرفق إضافي",
};

export function programLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return programLabels[value as ProgramValue] ?? value;
}

export function userRoleLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return userRoleLabels[value] ?? value;
}

export function projectStatusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return projectStatusLabels[value] ?? value;
}

export function projectFileTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return projectFileTypeLabels[value] ?? value;
}

export function gradingStatusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return gradingStatusLabels[value] ?? value;
}
