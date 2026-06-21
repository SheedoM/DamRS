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

export const panelMemberTypeValues = ["supervisor", "referee", "committee_head"] as const;

export type PanelMemberTypeValue = (typeof panelMemberTypeValues)[number];

export const panelMemberTypeLabels: Record<PanelMemberTypeValue, string> = {
  supervisor: "مشرف",
  referee: "محكم",
  committee_head: "رئيس لجنة",
};

export const panelMemberTypeOptions = panelMemberTypeValues.map((value) => ({
  value,
  label: panelMemberTypeLabels[value],
}));

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
  documentation_pdf: "ملف التوثيق (PDF)",
  source_code_zip: "الكود المصدري (ZIP)",
  presentation_file: "ملف العرض التقديمي",
  extra_attachment: "مرفق إضافي",
};

export function programLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return programLabels[value as ProgramValue] ?? value;
}

export function panelMemberTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return panelMemberTypeLabels[value as PanelMemberTypeValue] ?? value;
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
