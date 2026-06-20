import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = join(process.cwd(), "src", "app", "admin", "projects", "[projectId]", "page.tsx");

function readPage() {
  return readFileSync(pagePath, "utf8");
}

describe("admin project detail layout", () => {
  it("shows uploaded files and team members as full-width sections below the project summary", () => {
    const source = readPage();

    const projectIndex = source.indexOf("<CardTitle>Project</CardTitle>");
    const uploadedFilesIndex = source.indexOf("<CardTitle>Uploaded Files</CardTitle>");
    const teamMembersIndex = source.indexOf("<CardTitle>Team Members</CardTitle>");
    const projectGradeIndex = source.indexOf("<CardTitle>Project Grade</CardTitle>");

    expect(projectIndex).toBeGreaterThan(-1);
    expect(uploadedFilesIndex).toBeGreaterThan(projectIndex);
    expect(teamMembersIndex).toBeGreaterThan(uploadedFilesIndex);
    expect(projectGradeIndex).toBeGreaterThan(teamMembersIndex);
    expect(source).not.toContain("xl:grid-cols-2");
  });

  it("keeps assignment controls inside panel reviews without a separate assignments section", () => {
    const source = readPage();
    const panelReviewsIndex = source.indexOf("<CardHeader><CardTitle>Panel Reviews</CardTitle></CardHeader>");
    const assignFormIndex = source.indexOf("<AssignPanelMemberForm");
    const revokeFormIndex = source.indexOf("<RevokeAssignmentForm");

    expect(panelReviewsIndex).toBeGreaterThan(-1);
    expect(assignFormIndex).toBeGreaterThan(panelReviewsIndex);
    expect(revokeFormIndex).toBeGreaterThan(panelReviewsIndex);
    expect(source).not.toContain("<CardHeader><CardTitle>Assignments</CardTitle></CardHeader>");
  });
});
