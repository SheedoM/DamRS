import { describe, expect, it } from "vitest";

import {
  buildDraftReviewPayload,
  buildFinalReviewPayload,
  calculateReviewTotal,
  draftReviewFormSchema,
  finalReviewFormSchema,
  getPanelDashboardStats,
  getPanelProjectReviewStatus,
} from "./review.schema";

const projectId = "11111111-1111-4111-8111-111111111111";
const panelMemberId = "22222222-2222-4222-8222-222222222222";

describe("review helpers", () => {
  it("calculates a total score from rubric fields", () => {
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

  it("builds a draft review payload and zeroes final-only scores", () => {
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
      review_type: "draft",
      documentation_score: 20,
      implementation_score: 22,
      code_quality_score: 18,
      innovation_score: 12,
      presentation_score: 0,
      discussion_score: 0,
      notes: "Strong documentation.",
      questions: null,
    });
  });

  it("builds a final review payload and zeroes draft-only scores", () => {
    expect(
      buildFinalReviewPayload(
        {
          presentation_score: 9,
          discussion_score: 10,
          notes: "",
          questions: "Clarify deployment plan.",
        },
        projectId,
        panelMemberId,
      ),
    ).toMatchObject({
      project_id: projectId,
      panel_member_id: panelMemberId,
      review_type: "final",
      documentation_score: 0,
      implementation_score: 0,
      code_quality_score: 0,
      innovation_score: 0,
      presentation_score: 9,
      discussion_score: 10,
      notes: null,
      questions: "Clarify deployment plan.",
    });
  });

  it("validates score upper bounds for final reviews", () => {
    const result = finalReviewFormSchema.safeParse({
      presentation_score: "11",
      discussion_score: "10",
      notes: "",
      questions: "",
    });

    expect(result.success).toBe(false);
  });

  it("summarizes draft and final review status", () => {
    expect(
      getPanelProjectReviewStatus([
        { review_type: "draft", submitted_at: "2026-06-20T08:00:00.000Z" },
        { review_type: "final", submitted_at: null },
      ]),
    ).toEqual({
      draftSubmitted: true,
      draftSubmittedAt: "2026-06-20T08:00:00.000Z",
      finalSubmitted: false,
      finalSubmittedAt: null,
      fullyReviewed: false,
    });
  });

  it("builds panel dashboard stats from review summaries", () => {
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
            draftSubmitted: false,
            draftSubmittedAt: null,
            finalSubmitted: false,
            finalSubmittedAt: null,
            fullyReviewed: false,
          },
        },
      ]),
    ).toEqual({
      assignedProjects: 2,
      reviewedProjects: 1,
      pendingDraftReviews: 1,
      pendingFinalReviews: 1,
    });
  });
});

