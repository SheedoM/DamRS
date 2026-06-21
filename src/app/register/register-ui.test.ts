import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const registerPagePath = join(process.cwd(), "src", "app", "register", "page.tsx");
const loginPagePath = join(process.cwd(), "src", "app", "login", "page.tsx");

function readRegisterPage() {
  return readFileSync(registerPagePath, "utf8");
}

function readLoginPage() {
  return readFileSync(loginPagePath, "utf8");
}

describe("student signup UI", () => {
  it("collects only university ID and national ID — no name, program, email, or password fields", () => {
    const source = readRegisterPage();

    expect(source).toContain('name="student_id"');
    expect(source).toContain('name="national_id"');
    expect(source).not.toContain('name="full_name"');
    expect(source).not.toContain('name="program"');
    expect(source).not.toContain('name="email"');
    expect(source).not.toContain('name="password"');
  });

  it("links students from login to self-registration", () => {
    const source = readLoginPage();

    expect(source).toContain('from "next/link"');
    expect(source).toContain('href="/register"');
    expect(source).toContain("ليس لديك حساب طالب؟");
  });
});
