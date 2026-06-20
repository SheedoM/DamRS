import { describe, expect, it } from "vitest";

import {
  buildDraftReviewPayload,
  buildFinalReviewPayload,
  calculateReviewTotal,
  draftReviewFormSchema,
  finalReviewFormSchema,
  getOfficialProjectGrade,
  getPanelDashboardStats,
  getPanelProjectReviewStatus,
  getProjectStatusFromReviewProgress,
} from "./review.schema";

const projectId = "11111111-1111-4111-8111-111111111111";
const panelMemberId = "22222222-2222-4222-8222-222222222222";

describe("unified review helpers", () => {
  it("calculates one review total out of 100", () => {
    expect(
      calculateReviewTotal({
        documentation_score: 18,
        implementation_score: 23,
        code_quality_score: 19,
        innovation_score: 14,
        presentation_score: 9,
        discussion_score: 8,
      }),
    ).toBe(91);
  });

  it("validates score upper bounds for draft reviews", () => {
    const result = draftReviewFormSchema.safeParse({
      documentation_score: "21",
      implementation_score: "25",
      code_quality_score: "20",
      innovation_score: "15",
      notes: "",
      questions: "",
    });

    expect(result.success).toBe(false);
  });

  it("builds a draft review payload for the unified review row", () => {
    expect(
      buildDraftReviewPayload(
        {
          documentation_score: 20,
          implementation_score: 22,
          code_quality_score: 18,
          innovation_score: 12,
          notes: "Strong documentation.",
          questions: "",
        },
        projectId,
        panelMemberId,
      ),
    ).toMatchObject({
      project_id: projectId,
      panel_member_id: panelMemberId,
      status: "draft_reviewed",
      documentation_score: 20,
      implementation_score: 22,
      code_quality_score: 18,
      innovation_score: 12,
      draft_notes: "Strong documentation.",
      draft_questions: null,
    });
  });

  it("builds a final review payload without questions", () => {
    expect(
      buildFinalReviewPayload({
        presentation_score: 9,
        discussion_score: 10,
        notes: "",
      }),
    ).toMatchObject({
      status: "final_reviewed",
      presentation_score: 9,
      discussion_score: 10,
      final_notes: null,
    });
  });

  it("validates score upper bounds for final reviews", () => {
    const result = finalReviewFormSchema.safeParse({
      presentation_score: "11",
      discussion_score: "10",
      notes: "",
    });

    expect(result.success).toBe(false);
  });

  it("summarizes unified draft and final review status", () => {
    expect(
      getPanelProjectReviewStatus({
        status: "draft_reviewed",
        draft_submitted_at: "2026-06-20T08:00:00.000Z",
        final_submitted_at: null,
      }),
    ).toEqual({
      draftSubmitted: true,
      draftSubmittedAt: "2026-06-20T08:00:00.000Z",
      finalSubmitted: false,
      finalSubmittedAt: null,
      fullyReviewed: false,
    });
  });

  it("requires all active panel members to submit final reviews before official panel grade appears", () => {
    expect(
      getOfficialProjectGrade({
        activePanelMemberIds: ["p1", "p2"],
        reviews: [
          {
            panel_member_id: "p1",
            status: "final_reviewed",
            documentation_score: 18,
            implementation_score: 23,
            code_quality_score: 19,
            innovation_score: 14,
            presentation_score: 9,
            discussion_score: 7,
          },
        ],
        activeOverride: null,
      }),
    ).toEqual({
      completedReviewCount: 1,
      requiredReviewCount: 2,
      isPanelComplete: false,
      panelAverage: null,
      panelAveragePercentage: null,
      provisionalAverage: 90,
      provisionalAveragePercentage: "90.00%",
      officialGrade: null,
      officialPercentage: null,
      officialSource: null,
    });
  });

  it("averages completed reviews after every active panel member submits final review", () => {
    expect(
      getOfficialProjectGrade({
        activePanelMemberIds: ["p1", "p2"],
        reviews: [
          {
            panel_member_id: "p1",
            status: "final_reviewed",
            documentation_score: 18,
            implementation_score: 23,
            code_quality_score: 19,
            innovation_score: 14,
            presentation_score: 9,
            discussion_score: 7,
          },
          {
            panel_member_id: "p2",
            status: "final_reviewed",
            documentation_score: 17,
            implementation_score: 21,
            code_quality_score: 17,
            innovation_score: 12,
            presentation_score: 8,
            discussion_score: 7,
          },
        ],
        activeOverride: null,
      }).officialPercentage,
    ).toBe("86.00%");
  });

  it("uses dean override as the official grade while preserving panel average", () => {
    expect(
      getOfficialProjectGrade({
        activePanelMemberIds: ["p1", "p2"],
        reviews: [
          {
            panel_member_id: "p1",
            status: "final_reviewed",
            documentation_score: 18,
            implementation_score: 23,
            code_quality_score: 19,
            innovation_score: 14,
            presentation_score: 9,
            discussion_score: 7,
          },
          {
            panel_member_id: "p2",
            status: "final_reviewed",
            documentation_score: 17,
            implementation_score: 21,
            code_quality_score: 17,
            innovation_score: 12,
            presentation_score: 8,
            discussion_score: 7,
          },
        ],
        activeOverride: {
          documentation_score: 20,
          implementation_score: 23,
          code_quality_score: 20,
          innovation_score: 14,
          presentation_score: 8,
          discussion_score: 7,
        },
      }),
    ).toMatchObject({
      panelAverage: 86,
      panelAveragePercentage: "86.00%",
      officialGrade: 92,
      officialPercentage: "92.00%",
      officialSource: "override",
    });
  });

  it("recomputes project status from active assignment review progress", () => {
    expect(
      getProjectStatusFromReviewProgress({
        currentStatus: "assigned",
        activePanelMemberIds: ["p1", "p2"],
        reviews: [{ panel_member_id: "p1", status: "draft_reviewed" }],
      }),
    ).toBe("assigned");

    expect(
      getProjectStatusFromReviewProgress({
        currentStatus: "assigned",
        activePanelMemberIds: ["p1", "p2"],
        reviews: [
          { panel_member_id: "p1", status: "draft_reviewed" },
          { panel_member_id: "p2", status: "draft_reviewed" },
        ],
      }),
    ).toBe("draft_reviewed");

    expect(
      getProjectStatusFromReviewProgress({
        currentStatus: "draft_reviewed",
        activePanelMemberIds: ["p1", "p2"],
        reviews: [
          { panel_member_id: "p1", status: "final_reviewed" },
          { panel_member_id: "p2", status: "final_reviewed" },
        ],
      }),
    ).toBe("final_reviewed");
  });

  it("builds panel dashboard stats from unified review summaries", () => {
    expect(
      getPanelDashboardStats([
        {
          reviewStatus: {
            draftSubmitted: true,
            draftSubmittedAt: "2026-06-20T08:00:00.000Z",
            finalSubmitted: true,
            finalSubmittedAt: "2026-06-20T12:00:00.000Z",
            fullyReviewed: true,
          },
        },
        {
          reviewStatus: {
            draftSubmitted: true,
            draftSubmittedAt: "2026-06-20T08:00:00.000Z",
            finalSubmitted: false,
            finalSubmittedAt: null,
            fullyReviewed: false,
          },
        },
      ]),
    ).toEqual({
      assignedProjects: 2,
      reviewedProjects: 1,
      pendingDraftReviews: 0,
      pendingFinalReviews: 1,
    });
  });
});

