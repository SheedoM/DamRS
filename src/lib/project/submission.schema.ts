import { z } from "zod";

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

export const teamMemberSchema = z.object({
  full_name: z.string().trim().min(2, "Team member name is required."),
  student_id: z.string().trim().min(3, "Student ID is required."),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .pipe(z.string().email().nullable()),
  role_in_team: z.string().trim().min(2).default("member"),
});

export const projectFormSchema = z.object({
  title: z.string().trim().min(5, "Project title is required."),
  abstract: z.string().trim().min(20, "Project abstract must be at least 20 characters."),
  department: z.string().trim().min(2, "Department is required."),
  supervisor_name: z.string().trim().min(2, "Supervisor name is required."),
  technologies_used: z.string().trim().optional().transform((value) => value || null),
  github_url: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null)
    .pipe(z.string().url().nullable()),
  demo_video_url: z.string().trim().url("Demo video URL must be a valid URL."),
  team_members: z.array(teamMemberSchema).min(1, "At least one team member is required."),
});

export type ProjectFormInput = z.input<typeof projectFormSchema>;
export type ProjectFormData = z.output<typeof projectFormSchema>;

type SubmissionRequirementInput = {
  title: string | null;
  abstract: string | null;
  department: string | null;
  supervisor_name: string | null;
  demo_video_url: string | null;
  teamMemberCount: number;
  fileTypes: string[];
};

const requiredFileLabels: Record<RequiredSubmissionFileType, string> = {
  documentation_pdf: "Documentation PDF",
  source_code_zip: "Source code ZIP",
};

function isBlank(value: string | null) {
  return !value || value.trim().length === 0;
}

export function getMissingSubmissionRequirements(input: SubmissionRequirementInput) {
  const missing: string[] = [];

  if (isBlank(input.title)) missing.push("Project title");
  if (isBlank(input.abstract)) missing.push("Project abstract");
  if (isBlank(input.department)) missing.push("Department");
  if (isBlank(input.supervisor_name)) missing.push("Supervisor name");
  if (isBlank(input.demo_video_url)) missing.push("Demo video URL");
  if (input.teamMemberCount < 1) missing.push("At least one team member");

  for (const fileType of requiredSubmissionFileTypes) {
    if (!input.fileTypes.includes(fileType)) {
      missing.push(requiredFileLabels[fileType]);
    }
  }

  return missing;
}
