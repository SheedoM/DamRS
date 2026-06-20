import { describe, expect, it } from "vitest";

import { getSubmissionWindowState } from "./submission-windows";

describe("submission window view state", () => {
  it("returns empty state when there is no submission window", () => {
    expect(getSubmissionWindowState(null)).toEqual({
      hasWindow: false,
      isOpen: false,
      label: "No submission window",
    });
  });

  it("marks a current window as open", () => {
    expect(
      getSubmissionWindowState({
        opens_at: "2026-06-20T08:00:00.000Z",
        closes_at: "2026-06-20T10:00:00.000Z",
      }, new Date("2026-06-20T09:00:00.000Z")),
    ).toEqual({
      hasWindow: true,
      isOpen: true,
      label: "Open",
    });
  });

  it("marks future or expired windows as closed", () => {
    expect(
      getSubmissionWindowState({
        opens_at: "2026-06-20T08:00:00.000Z",
        closes_at: "2026-06-20T10:00:00.000Z",
      }, new Date("2026-06-20T11:00:00.000Z")).label,
    ).toBe("Closed");
  });
});
