import { describe, expect, it } from "vitest";

import {
  buildLeaderCsv,
  buildLeaderCsvRows,
  buildMissingLeaderPlaceholder,
  buildProjectLeaderSeedFields,
  missingLeaderStudentId,
} from "./seed-from-sheet-helpers.mjs";

describe("seed-from-sheet helpers", () => {
  it("generates deterministic dummy leader IDs for projects without a matched leader", () => {
    const placeholder = buildMissingLeaderPlaceholder({
      number: "28",
      title_ar: "منصة تدريب",
    });

    expect(placeholder).toEqual({
      project_number: "28",
      full_name: "قائد مشروع 28",
      student_id: "999000028",
      email: "999000028@damrs.edu",
    });
    expect(missingLeaderStudentId("51")).toBe("999000051");
  });

  it("adds generated dummy IDs to leader CSV rows without passwords", () => {
    const rows = buildLeaderCsvRows(
      [
        {
          number: "1",
          title_ar: "مشروع مكتمل",
          leader_full_name: "رنا",
          leader_university_id: "806520052",
        },
        {
          number: "28",
          title_ar: "مشروع بلا قائد",
          leader_full_name: null,
          leader_university_id: null,
        },
      ],
      new Map([
        [
          "28",
          {
            project_number: "28",
            full_name: "قائد مشروع 28",
            student_id: "999000028",
            email: "999000028@damrs.edu",
          },
        ],
      ]),
    );

    expect(rows).toEqual([
      ["project_number", "title", "leader_name", "leader_university_id", "email", "status"],
      ["1", "مشروع مكتمل", "رنا", "806520052", "806520052@damrs.edu", "matched"],
      ["28", "مشروع بلا قائد", "قائد مشروع 28", "999000028", "999000028@damrs.edu", "generated-id"],
    ]);
  });

  it("builds a UTF-8 BOM CSV that escapes quotes", () => {
    const csv = buildLeaderCsv([
      ["project_number", "title"],
      ["11", '"سوكليفي"'],
    ]);

    expect(csv).toBe('﻿"project_number","title"\n"11","""سوكليفي"""');
  });

  it("keeps generated-ID projects pending until the leader self-registers", () => {
    expect(buildProjectLeaderSeedFields({ leader_university_id: "806520052" }, null)).toEqual({
      leader_university_id: "806520052",
      leader_full_name: null,
      team_leader_id: null,
    });

    expect(
      buildProjectLeaderSeedFields(
        { leader_university_id: null },
        {
          project_number: "28",
          full_name: "قائد مشروع 28",
          student_id: "999000028",
          email: "999000028@damrs.edu",
        },
      ),
    ).toEqual({
      leader_university_id: "999000028",
      leader_full_name: "قائد مشروع 28",
      team_leader_id: null,
    });
  });
});
