import { describe, expect, it } from "vitest";

import {
  getMissingSubmissionRequirements,
  projectFormSchema,
} from "./submission.schema";
import { buildProjectStoragePath, getBucketForFileType } from "./storage";

describe("project submission validation", () => {
  it("accepts a complete project form with team members", () => {
    const result = projectFormSchema.safeParse({
      title: "Smart Attendance System",
      abstract: "A graduation project that tracks attendance with computer vision.",
      department: "Computer Science",
      supervisor_name: "Dr. Example",
      technologies_used: "Next.js, Supabase, Python",
      github_url: "https://github.com/example/smart-attendance",
      demo_video_url: "https://youtu.be/example",
      team_members: [
        {
          full_name: "Student One",
          student_id: "20260001",
          email: "student.one@example.com",
          role_in_team: "team_leader",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("reports missing submission requirements before final submit", () => {
    const missing = getMissingSubmissionRequirements({
      title: "Smart Attendance System",
      abstract: "",
      department: "Computer Science",
      supervisor_name: "",
      demo_video_url: "",
      teamMemberCount: 0,
      fileTypes: ["documentation_pdf"],
    });

    expect(missing).toEqual([
      "Project abstract",
      "Supervisor name",
      "Demo video URL",
      "At least one team member",
      "Source code ZIP",
      "Presentation file",
    ]);
  });

  it("returns no missing requirements for a complete submission", () => {
    const missing = getMissingSubmissionRequirements({
      title: "Smart Attendance System",
      abstract: "Complete abstract",
      department: "Computer Science",
      supervisor_name: "Dr. Example",
      demo_video_url: "https://drive.google.com/file/d/example",
      teamMemberCount: 3,
      fileTypes: ["documentation_pdf", "source_code_zip", "presentation_file"],
    });

    expect(missing).toEqual([]);
  });
});

describe("project storage", () => {
  it("maps file types to the private storage buckets", () => {
    expect(getBucketForFileType("documentation_pdf")).toBe("project-documents");
    expect(getBucketForFileType("source_code_zip")).toBe("project-source-code");
    expect(getBucketForFileType("presentation_file")).toBe("project-presentations");
  });

  it("builds a sanitized path with cycle id and project id as the first two segments", () => {
    expect(
      buildProjectStoragePath({
        cycleId: "cycle-123",
        projectId: "project-456",
        fileName: "Final Presentation 2026!.pptx",
      }),
    ).toBe("cycle-123/project-456/final-presentation-2026.pptx");
  });
});
