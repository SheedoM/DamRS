import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const exportScript = join(process.cwd(), "scripts", "export-panel-credentials.mjs");
const builderScript = join(process.cwd(), "scripts", "credential-docx-builder.py");

function pythonExecutable() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const bundled = join(
    homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "python.exe",
  );
  return existsSync(bundled) ? bundled : "python";
}

function readDocxText(path) {
  return execFileSync(
    pythonExecutable(),
    [
      "-c",
      "from docx import Document; import sys; doc=Document(sys.argv[1]); print('\\n'.join(p.text for p in doc.paragraphs)); print('\\n'.join(cell.text for t in doc.tables for r in t.rows for cell in r.cells))",
      path,
    ],
    { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
  );
}

describe("credential DOCX export tooling", () => {
  it("exports panel and leader DOCX files instead of CSV files", () => {
    const source = readFileSync(exportScript, "utf8");

    expect(source).toContain("credential-docx-builder.py");
    expect(source).toContain("panel-credentials.docx");
    expect(source).toContain("leaders.docx");
    expect(source).not.toContain("panel-credentials.csv");
    expect(source).not.toContain("leaders.csv");
    expect(source).not.toContain("writeFileSync");
  });

  it("builds styled DOCX files for panel credentials and leader registration data", () => {
    const workDir = mkdtempSync(join(tmpdir(), "credential-docx-"));
    const inputPath = join(workDir, "credentials.json");
    const panelPath = join(workDir, "panel-credentials.docx");
    const leadersPath = join(workDir, "leaders.docx");

    writeFileSync(
      inputPath,
      JSON.stringify({
        panel: [
          {
            full_name: "د/ أحمد محمد ربيع",
            email: "ahmd.rbya@damrs.edu",
            password: "Damrs-12345678",
            type: "supervisor",
          },
        ],
        leaders: [
          {
            project_number: "28",
            title: "منصة تدريب",
            leader_name: "قائد مشروع 28",
            leader_university_id: "999000028",
            email: "999000028@damrs.edu",
            status: "generated-id",
          },
        ],
      }),
      "utf8",
    );

    try {
      execFileSync(pythonExecutable(), [
        builderScript,
        "--input",
        inputPath,
        "--panel-out",
        panelPath,
        "--leaders-out",
        leadersPath,
      ], { stdio: "pipe" });

      const panelDocx = readFileSync(panelPath);
      const leadersDocx = readFileSync(leadersPath);
      expect(panelDocx.subarray(0, 2).toString()).toBe("PK");
      expect(leadersDocx.subarray(0, 2).toString()).toBe("PK");
      expect(panelDocx.length).toBeGreaterThan(10_000);
      expect(leadersDocx.length).toBeGreaterThan(10_000);
      expect(readDocxText(panelPath)).toContain("كشف بيانات دخول أعضاء اللجان");
      expect(readDocxText(panelPath)).toContain("ahmd.rbya@damrs.edu");
      expect(readDocxText(leadersPath)).toContain("كشف قادة الفرق وبيانات التسجيل");
      expect(readDocxText(leadersPath)).toContain("999000028");
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
