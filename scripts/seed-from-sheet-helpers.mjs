export function missingLeaderStudentId(projectNumber) {
  const normalized = String(projectNumber).trim().replace(/\D/g, "");
  return `999${normalized.padStart(6, "0")}`;
}

export function buildMissingLeaderPlaceholder(project) {
  const studentId = missingLeaderStudentId(project.number);

  return {
    project_number: String(project.number),
    full_name: `قائد مشروع ${project.number}`,
    student_id: studentId,
    email: `${studentId}@damrs.edu`,
  };
}

export function csv(rows) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function buildLeaderCsvRows(projects, missingLeaderCredentials) {
  return [
    ["project_number", "title", "leader_name", "leader_university_id", "email", "status"],
    ...projects.map((project) => {
      const credential = missingLeaderCredentials.get(String(project.number));
      if (credential) {
        return [
          project.number,
          project.title_ar,
          credential.full_name,
          credential.student_id,
          credential.email,
          "generated-id",
        ];
      }

      const leaderId = project.leader_university_id || "";
      return [
        project.number,
        project.title_ar,
        project.leader_full_name || "",
        leaderId,
        leaderId ? `${leaderId}@damrs.edu` : "",
        leaderId ? "matched" : "NO LEADER",
      ];
    }),
  ];
}

export function buildLeaderCsv(rows) {
  return "﻿" + csv(rows);
}

export function buildProjectLeaderSeedFields(project, missingLeaderCredential) {
  if (!missingLeaderCredential) {
    return {
      leader_university_id: project.leader_university_id || null,
      leader_full_name: project.leader_full_name || null,
      team_leader_id: null,
    };
  }

  return {
    leader_university_id: missingLeaderCredential.student_id,
    leader_full_name: missingLeaderCredential.full_name,
    team_leader_id: null,
  };
}
