import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = join(process.cwd(), "src", "app", "admin", "projects", "[projectId]", "page.tsx");

function readPage() {
  return readFileSync(pagePath, "utf8");
}

describe("admin project detail layout", () => {
  it("orders project, files, committee, then per-student grades", () => {
    const source = readPage();

    const projectIndex = source.indexOf("<CardTitle>المشروع</CardTitle>");
    const uploadedFilesIndex = source.indexOf("<CardTitle>الملفات المرفوعة</CardTitle>");
    const committeeIndex = source.indexOf("<CardTitle>أعضاء اللجنة</CardTitle>");
    const studentGradesIndex = source.indexOf("<CardTitle>درجات الطلاب</CardTitle>");

    expect(projectIndex).toBeGreaterThan(-1);
    expect(uploadedFilesIndex).toBeGreaterThan(projectIndex);
    expect(committeeIndex).toBeGreaterThan(uploadedFilesIndex);
    expect(studentGradesIndex).toBeGreaterThan(committeeIndex);
  });

  it("keeps assignment controls inside the committee card and renders the student grades form", () => {
    const source = readPage();
    const committeeIndex = source.indexOf("<CardTitle>أعضاء اللجنة</CardTitle>");
    const assignFormIndex = source.indexOf("<AssignPanelMemberForm");
    const revokeFormIndex = source.indexOf("<RevokeAssignmentForm");

    expect(committeeIndex).toBeGreaterThan(-1);
    expect(assignFormIndex).toBeGreaterThan(committeeIndex);
    expect(revokeFormIndex).toBeGreaterThan(committeeIndex);
    expect(source).toContain("<StudentGradesForm");
  });
});
