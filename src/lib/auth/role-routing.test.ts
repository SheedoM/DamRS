import { describe, expect, it } from "vitest";

import { getDashboardPathForRole, isUserRole } from "./roles";

describe("role routing", () => {
  it("maps each supported role to its dashboard route", () => {
    expect(getDashboardPathForRole("admin")).toBe("/admin");
    expect(getDashboardPathForRole("student")).toBe("/student");
    expect(getDashboardPathForRole("panel_member")).toBe("/panel");
  });

  it("accepts only supported role values", () => {
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("student")).toBe(true);
    expect(isUserRole("panel_member")).toBe(true);
    expect(isUserRole("supervisor")).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });
});
