import { describe, expect, it } from "vitest";

import {
  buildStudentAuthCredentials,
  buildStudentProfileInsert,
  parseStudentRegistrationForm,
  rosterNationalIdMismatch,
} from "./registration";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

describe("student registration helpers", () => {
  it("derives the auth email from the university ID and uses national ID as password", () => {
    const credentials = buildStudentAuthCredentials({
      student_id: " 20210001 ",
      national_id: "30203150100015",
    });

    expect(credentials).toEqual({
      email: "20210001@damrs.edu",
      password: "30203150100015",
      email_confirm: true,
      user_metadata: {
        full_name: "20210001",
        role: "student",
        student_id: "20210001",
      },
    });
  });

  it("collects only university ID and national ID", () => {
    const parsed = parseStudentRegistrationForm(
      form({ student_id: "20210001", national_id: "30203150100015" }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual({ student_id: "20210001", national_id: "30203150100015" });
    }
  });

  it("rejects invalid national ID values", () => {
    const parsed = parseStudentRegistrationForm(
      form({ student_id: "20210001", national_id: "123" }),
    );

    expect(parsed).toEqual({
      ok: false,
      message: "الرقم القومي يجب أن يتكون من 14 رقمًا.",
    });
  });

  it("flags roster national ID mismatch only when the roster stores a national ID", () => {
    expect(rosterNationalIdMismatch("30203150100015", "30203150100015")).toBe(false);
    expect(rosterNationalIdMismatch("30203150100015", "30203150100016")).toBe(true);
    expect(rosterNationalIdMismatch(null, "30203150100016")).toBe(false);
    expect(rosterNationalIdMismatch("", "30203150100016")).toBe(false);
  });

  it("builds the student profile insert with the derived login email and ID as name", () => {
    const profile = buildStudentProfileInsert("user-1", {
      student_id: "20210001",
      national_id: "30203150100015",
    });

    expect(profile).toEqual({
      id: "user-1",
      full_name: "20210001",
      email: "20210001@damrs.edu",
      role: "student",
      student_id: "20210001",
      national_id: "30203150100015",
    });
  });
});
