import { z } from "zod";

import { programValues, type ProgramValue } from "../../lib/i18n/labels";

export type StudentRegistrationInput = {
  full_name: string;
  student_id: string;
  national_id: string;
  program: ProgramValue;
};

export type StudentRegistrationParseResult =
  | { ok: true; data: StudentRegistrationInput }
  | { ok: false; message: string };

export const registerStudentSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم الكامل مطلوب."),
  student_id: z.string().trim().min(3, "الرقم الجامعي مطلوب."),
  national_id: z.string().trim().regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقمًا."),
  program: z.enum(programValues, { message: "اختر البرنامج." }),
});

export function deriveStudentAuthEmail(studentId: string) {
  return `${studentId.trim()}@damrs.edu`;
}

export function parseStudentRegistrationForm(formData: FormData): StudentRegistrationParseResult {
  const parsed = registerStudentSchema.safeParse({
    full_name: formData.get("full_name"),
    student_id: formData.get("student_id"),
    national_id: formData.get("national_id"),
    program: formData.get("program"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات التسجيل غير صالحة." };
  }

  return { ok: true, data: parsed.data };
}

export function buildStudentAuthCredentials(input: StudentRegistrationInput) {
  const fullName = input.full_name.trim();
  const studentId = input.student_id.trim();
  const nationalId = input.national_id.trim();

  return {
    email: deriveStudentAuthEmail(studentId),
    password: nationalId,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "student",
      student_id: studentId,
      program: input.program,
    },
  };
}

export function buildStudentProfileInsert(userId: string, input: StudentRegistrationInput) {
  const fullName = input.full_name.trim();
  const studentId = input.student_id.trim();
  const nationalId = input.national_id.trim();

  return {
    id: userId,
    full_name: fullName,
    email: deriveStudentAuthEmail(studentId),
    role: "student",
    student_id: studentId,
    national_id: nationalId,
    program: input.program,
  };
}

export function rosterNationalIdMismatch(
  rosterNationalId: string | null | undefined,
  submittedNationalId: string,
) {
  return Boolean(rosterNationalId?.trim()) && rosterNationalId?.trim() !== submittedNationalId.trim();
}
