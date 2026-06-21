import { z } from "zod";

export type StudentRegistrationInput = {
  student_id: string;
  national_id: string;
};

export type StudentRegistrationParseResult =
  | { ok: true; data: StudentRegistrationInput }
  | { ok: false; message: string };

// Sign-up collects only the university ID and national ID; name/program are
// not asked for (the leader is identified by their university ID).
export const registerStudentSchema = z.object({
  student_id: z.string().trim().min(3, "الرقم الجامعي مطلوب."),
  national_id: z.string().trim().regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقمًا."),
});

export function deriveStudentAuthEmail(studentId: string) {
  return `${studentId.trim()}@damrs.edu`;
}

export function parseStudentRegistrationForm(formData: FormData): StudentRegistrationParseResult {
  const parsed = registerStudentSchema.safeParse({
    student_id: formData.get("student_id"),
    national_id: formData.get("national_id"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات التسجيل غير صالحة." };
  }

  return { ok: true, data: parsed.data };
}

export function buildStudentAuthCredentials(input: StudentRegistrationInput) {
  const studentId = input.student_id.trim();
  const nationalId = input.national_id.trim();

  return {
    email: deriveStudentAuthEmail(studentId),
    password: nationalId,
    email_confirm: true,
    user_metadata: {
      full_name: studentId,
      role: "student",
      student_id: studentId,
    },
  };
}

export function buildStudentProfileInsert(userId: string, input: StudentRegistrationInput) {
  const studentId = input.student_id.trim();
  const nationalId = input.national_id.trim();

  // profiles.full_name is NOT NULL; default it to the university ID until the
  // leader is otherwise identified.
  return {
    id: userId,
    full_name: studentId,
    email: deriveStudentAuthEmail(studentId),
    role: "student",
    student_id: studentId,
    national_id: nationalId,
  };
}

export function rosterNationalIdMismatch(
  rosterNationalId: string | null | undefined,
  submittedNationalId: string,
) {
  return Boolean(rosterNationalId?.trim()) && rosterNationalId?.trim() !== submittedNationalId.trim();
}
