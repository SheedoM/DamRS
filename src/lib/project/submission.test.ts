import { describe, expect, it } from "vitest";

import {
  getMissingSubmissionRequirements,
  projectFormSchema,
} from "./submission.schema";
import {
  buildProjectStoragePath,
  createSignedUrlForProjectFile,
  getBucketForFileType,
  getBucketForProjectFileType,
  SIGNED_FILE_URL_EXPIRES_IN_SECONDS,
} from "./storage";

describe("project submission validation", () => {
  it("accepts a complete project form with team members", () => {
    const result = projectFormSchema.safeParse({
      title: "Smart Attendance System",
      title_en: "Smart Attendance System",
      abstract: "A graduation project that tracks attendance with computer vision.",
      supervisor_name: "Dr. Example",
      technologies_used: "Next.js, Supabase, Python",
      github_url: "https://github.com/example/smart-attendance",
      demo_video_url: "https://youtu.be/example",
      source_code_url: "https://drive.google.com/file/d/source",
      team_members: [
        {
          full_name: "Student One",
          student_id: "20260001",
          national_id: "29001011234567",
          program: "computer_science",
          role_in_team: "team_leader",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("reports missing submission requirements before final submit", () => {
    const missing = getMissingSubmissionRequirements({
      title: "Smart Attendance System",
      title_en: "Smart Attendance System",
      abstract: "",
      supervisor_name: "",
      demo_video_url: "",
      source_code_url: "",
      hasLegacySourceZip: false,
      teamMemberCount: 0,
      fileTypes: ["documentation_pdf"],
    });

    expect(missing).toEqual([
      "ملخص المشروع",
      "اسم المشرف",
      "رابط فيديو العرض",
      "رابط الكود المصدري",
      "عضو فريق واحد على الأقل",
    ]);
  });

  it("returns no missing requirements when required PDF and source link are present", () => {
    const missing = getMissingSubmissionRequirements({
      title: "Smart Attendance System",
      title_en: "Smart Attendance System",
      abstract: "Complete abstract",
      supervisor_name: "Dr. Example",
      demo_video_url: "https://drive.google.com/file/d/example",
      source_code_url: "https://drive.google.com/file/d/source",
      hasLegacySourceZip: false,
      teamMemberCount: 3,
      fileTypes: ["documentation_pdf"],
    });

    expect(missing).toEqual([]);
  });

  it("accepts a legacy source ZIP when the source link is absent", () => {
    const missing = getMissingSubmissionRequirements({
      title: "Smart Attendance System",
      title_en: "Smart Attendance System",
      abstract: "Complete abstract",
      supervisor_name: "Dr. Example",
      demo_video_url: "https://drive.google.com/file/d/example",
      source_code_url: null,
      hasLegacySourceZip: true,
      teamMemberCount: 3,
      fileTypes: ["documentation_pdf", "source_code_zip"],
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

  it("returns no bucket for file types that should not get signed URLs", () => {
    expect(getBucketForProjectFileType("documentation_pdf")).toBe("project-documents");
    expect(getBucketForProjectFileType("source_code_zip")).toBe("project-source-code");
    expect(getBucketForProjectFileType("presentation_file")).toBe("project-presentations");
    expect(getBucketForProjectFileType("extra_attachment")).toBeNull();
    expect(getBucketForProjectFileType("unknown")).toBeNull();
    expect(getBucketForProjectFileType(null)).toBeNull();
  });

  it("creates signed URLs only for supported private file types", async () => {
    const calls: { bucket: string; path: string; expiresIn: number }[] = [];
    const fakeSupabase = {
      storage: {
        from(bucket: string) {
          return {
            async createSignedUrl(path: string, expiresIn: number) {
              calls.push({ bucket, path, expiresIn });
              return { data: { signedUrl: `https://signed.example/${bucket}/${path}` }, error: null };
            },
          };
        },
      },
    };

    await expect(
      createSignedUrlForProjectFile(fakeSupabase, {
        file_type: "documentation_pdf",
        storage_path: "cycle/project/documentation.pdf",
      }),
    ).resolves.toBe("https://signed.example/project-documents/cycle/project/documentation.pdf");
    await expect(
      createSignedUrlForProjectFile(fakeSupabase, {
        file_type: "extra_attachment",
        storage_path: "cycle/project/extra.bin",
      }),
    ).resolves.toBeNull();

    expect(calls).toEqual([
      {
        bucket: "project-documents",
        path: "cycle/project/documentation.pdf",
        expiresIn: SIGNED_FILE_URL_EXPIRES_IN_SECONDS,
      },
    ]);
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
