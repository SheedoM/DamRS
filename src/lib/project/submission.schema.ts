import { z } from "zod";

import { programValues } from "../i18n/labels";

export const projectFileTypes = [
  "documentation_pdf",
  "source_code_zip",
  "presentation_file",
] as const;

export type RequiredProjectFileType = (typeof projectFileTypes)[number];

export const requiredSubmissionFileTypes = [
  "documentation_pdf",
  "source_code_zip",
] as const;

type RequiredSubmissionFileType = (typeof requiredSubmissionFileTypes)[number];

export const nationalIdSchema = z
  .string()
  .trim()
  .regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقمًا.");

export const teamMemberSchema = z.object({
  full_name: z.string().trim().min(2, "اسم عضو الفريق مطلوب."),
  student_id: z.string().trim().min(3, "الرقم الجامعي مطلوب."),
  national_id: nationalIdSchema,
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .pipe(z.string().email("بريد إلكتروني غير صالح.").nullable()),
  role_in_team: z.string().trim().min(2).default("member"),
});

export const projectFormSchema = z.object({
  title: z.string().trim().min(5, "عنوان المشروع مطلوب."),
  abstract: z.string().trim().min(20, "ملخص المشروع يجب أن يكون 20 حرفًا على الأقل."),
  program: z.enum(programValues, { message: "اختر البرنامج." }),
  supervisor_name: z.string().trim().min(2, "اسم المشرف مطلوب."),
  technologies_used: z.string().trim().optional().transform((value) => value || null),
  github_url: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .pipe(z.string().url("رابط غير صالح.").nullable()),
  demo_video_url: z.string().trim().url("رابط فيديو العرض يجب أن يكون رابطًا صالحًا."),
  team_members: z.array(teamMemberSchema).min(1, "يجب إضافة عضو واحد على الأقل."),
});

export type ProjectFormInput = z.input<typeof projectFormSchema>;
export type ProjectFormData = z.output<typeof projectFormSchema>;

type SubmissionRequirementInput = {
  title: string | null;
  abstract: string | null;
  program: string | null;
  supervisor_name: string | null;
  demo_video_url: string | null;
  teamMemberCount: number;
  fileTypes: string[];
};

const requiredFileLabels: Record<RequiredSubmissionFileType, string> = {
  documentation_pdf: "ملف التوثيق (PDF)",
  source_code_zip: "الكود المصدري (ZIP)",
};

function isBlank(value: string | null) {
  return !value || value.trim().length === 0;
}

export function getMissingSubmissionRequirements(input: SubmissionRequirementInput) {
  const missing: string[] = [];

  if (isBlank(input.title)) missing.push("عنوان المشروع");
  if (isBlank(input.abstract)) missing.push("ملخص المشروع");
  if (isBlank(input.program)) missing.push("البرنامج");
  if (isBlank(input.supervisor_name)) missing.push("اسم المشرف");
  if (isBlank(input.demo_video_url)) missing.push("رابط فيديو العرض");
  if (input.teamMemberCount < 1) missing.push("عضو فريق واحد على الأقل");

  for (const fileType of requiredSubmissionFileTypes) {
    if (!input.fileTypes.includes(fileType)) {
      missing.push(requiredFileLabels[fileType]);
    }
  }

  return missing;
}
