// Rich, realistic seed data for manual testing.
//
//   node scripts/seed.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
// and writes through the service-role client (bypasses RLS). Re-runnable: it
// first deletes anything it previously created (all seed accounts use the
// @gpseed.test email domain) before re-seeding.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------- env ----------
function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* fall back to existing process.env */
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "Password123!";
const SEED_DOMAIN = "@gpseed.test";
const CYCLE_NAME = "مشاريع التخرج 2025/2026";

function must(label, { error }) {
  if (error) {
    console.error(`✗ ${label}:`, error.message);
    process.exit(1);
  }
}

// 14-digit Egyptian-style national IDs, unique per call.
let nidSeq = 0;
function nid() {
  return String(29801010100001 + nidSeq++);
}

async function createUser(email, fullName, role, extraProfile = {}) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error || !data.user) {
    console.error(`✗ createUser ${email}:`, error?.message);
    process.exit(1);
  }
  must(`profile ${email}`, await db.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    email,
    role,
    ...extraProfile,
  }));
  return data.user.id;
}

// ---------- cleanup ----------
async function cleanup() {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const seedUsers = (list?.users || []).filter((u) => u.email?.endsWith(SEED_DOMAIN));
  const seedIds = seedUsers.map((u) => u.id);

  if (seedIds.length) {
    // Projects cascade to team_members / files / assignments / scores / supervision.
    await db.from("projects").delete().in("team_leader_id", seedIds);
    // Audit logs reference profiles with ON DELETE RESTRICT.
    await db.from("audit_logs").delete().in("actor_id", seedIds);
  }
  // Cycle cascades to submission_windows / grading_windows / eligible_students.
  await db.from("discussion_cycles").delete().eq("name", CYCLE_NAME);

  for (const u of seedUsers) {
    await db.auth.admin.deleteUser(u.id); // cascades the profile row
  }
  if (seedIds.length) console.log(`• cleaned up ${seedIds.length} previous seed account(s)`);
}

// ---------- seed ----------
async function seed() {
  // Admin
  const adminId = await createUser("admin" + SEED_DOMAIN, "مسؤول النظام", "admin", {
    department: "كلية الحاسبات والمعلومات بدمياط",
  });

  // Only one cycle may be active at a time — deactivate any others first.
  await db.from("discussion_cycles").update({ is_active: false }).eq("is_active", true);

  // Active cycle
  const { data: cycle } = await db
    .from("discussion_cycles")
    .insert({
      name: CYCLE_NAME,
      academic_year: "2025/2026",
      department: "كلية الحاسبات والمعلومات بدمياط",
      created_by: adminId,
      is_active: true,
    })
    .select("id")
    .single();
  const cycleId = cycle.id;

  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();

  // Submission window: open (opened a week ago, closes in three weeks)
  must("submission_window", await db.from("submission_windows").insert({
    cycle_id: cycleId,
    opens_at: iso(now - 7 * 864e5),
    closes_at: iso(now + 21 * 864e5),
    allow_late_submission: false,
    allow_edit_after_submit: true,
    created_by: adminId,
  }));

  // Grading window: OPEN so panel members can enter scores
  must("grading_window", await db.from("grading_windows").insert({
    cycle_id: cycleId,
    is_open: true,
    allow_edit_after_final: false,
    opened_at: iso(now),
    created_by: adminId,
  }));

  // Panel members (committee evaluators)
  const panel = {};
  panel.rabie = await createUser("rabie" + SEED_DOMAIN, "د. أحمد محمد ربيع", "panel_member", {
    department: "علوم الحاسب", panel_member_type: "supervisor",
  });
  panel.mona = await createUser("mona" + SEED_DOMAIN, "د. منى السيد حسن", "panel_member", {
    department: "نظم المعلومات", panel_member_type: "supervisor",
  });
  panel.khaled = await createUser("khaled" + SEED_DOMAIN, "د. خالد إبراهيم فؤاد", "panel_member", {
    department: "تكنولوجيا المعلومات", panel_member_type: "referee",
  });
  panel.sara = await createUser("sara" + SEED_DOMAIN, "د. سارة عبد الله النجار", "panel_member", {
    department: "الذكاء الاصطناعي", panel_member_type: "referee",
  });
  panel.wael = await createUser("wael" + SEED_DOMAIN, "أ.د. وائل عبد القادر عوض", "panel_member", {
    department: "كلية الحاسبات والمعلومات بدمياط", panel_member_type: "committee_head",
  });

  // ---- project definitions ----
  const projects = [
    {
      key: "A",
      leaderEmail: "rana" + SEED_DOMAIN,
      program: "artificial_intelligence",
      title: "شبكة ذكية ونظام أمان لمراكز البيانات",
      abstract: "نظام يعتمد على الذكاء الاصطناعي لمراقبة وتأمين مراكز البيانات واكتشاف التهديدات في الوقت الفعلي.",
      supervisor_name: "د. أحمد محمد ربيع",
      tech: "Python, TensorFlow, Next.js, Supabase",
      members: ["رنا علاء الدين شتا", "حنين أحمد البغدادي", "أكمل فتحي محمد"],
      evaluators: ["rabie", "khaled", "sara"],
      grading: "full",
    },
    {
      key: "B",
      leaderEmail: "shahd" + SEED_DOMAIN,
      program: "information_systems",
      title: "منصة تعليمية ذكية لإدارة المقررات",
      abstract: "منصة لإدارة المقررات والتقييمات مع توصيات مخصصة للطلاب بناءً على أدائهم.",
      supervisor_name: "د. منى السيد حسن",
      tech: "Next.js, NestJS, PostgreSQL",
      members: ["شهد باسم رضوان", "فارس هاني الخولاني"],
      evaluators: ["mona", "khaled", "sara"],
      grading: "partial", // only the supervisor submitted so far
    },
    {
      key: "C",
      leaderEmail: "mohamed" + SEED_DOMAIN,
      program: "medical_informatics",
      title: "تطبيق متابعة المرضى عن بُعد",
      abstract: "تطبيق يربط المرضى بالأطباء لمتابعة الحالة الصحية وتنبيهات الأدوية عن بُعد.",
      supervisor_name: "د. خالد إبراهيم فؤاد",
      tech: "Flutter, Firebase, Node.js",
      members: ["محمد أحمد العانوس", "سهيلة محمد عبد الباقي", "ليندا علاء الدين"],
      evaluators: ["khaled", "rabie", "wael"],
      grading: "assigned", // assigned, no scores yet
    },
    {
      key: "D",
      leaderEmail: "linda" + SEED_DOMAIN,
      program: "cybersecurity",
      title: "نظام كشف التطفل في الشبكات",
      abstract: "نظام لاكتشاف محاولات التطفل والهجمات على الشبكات باستخدام تعلم الآلة.",
      supervisor_name: "د. سارة عبد الله النجار",
      tech: "Python, Scapy, scikit-learn",
      members: ["ليندا محمد ضيف", "أحمد سمير فهمي"],
      evaluators: [], // submitted but not assigned to any committee yet
      grading: "submitted",
    },
    {
      key: "E",
      leaderEmail: "soheila" + SEED_DOMAIN,
      program: "computer_science",
      title: "روبوت محادثة عربي (مسودة)",
      abstract: "روبوت محادثة يدعم اللغة العربية للرد على استفسارات الطلاب. لا يزال قيد الإعداد.",
      supervisor_name: "د. أحمد محمد ربيع",
      tech: "Python, Transformers",
      members: ["سهيلة عبد الباقي السيد", "مريم خالد عوض"],
      evaluators: [],
      grading: "draft", // still a draft to test the student edit/submit flow
    },
  ];

  const claimedRoster = [];

  for (const p of projects) {
    const leaderName = p.members[0];
    const leaderUid = "806" + String(520000 + Math.floor(Math.random() * 9000));
    const leaderNid = nid();

    const leaderId = await createUser(p.leaderEmail, leaderName, "student", {
      student_id: leaderUid,
      national_id: leaderNid,
      program: p.program,
    });
    claimedRoster.push({ university_id: leaderUid, national_id: leaderNid, full_name: leaderName, claimed_by: leaderId });

    const isDraft = p.grading === "draft";
    const { data: project } = await db
      .from("projects")
      .insert({
        cycle_id: cycleId,
        team_leader_id: leaderId,
        title: p.title,
        abstract: p.abstract,
        department: "كلية الحاسبات والمعلومات بدمياط",
        program: p.program,
        supervisor_name: p.supervisor_name,
        technologies_used: p.tech,
        github_url: "https://github.com/example/" + p.key.toLowerCase(),
        demo_video_url: "https://youtu.be/example" + p.key,
        status: isDraft ? "draft" : p.grading === "submitted" ? "submitted" : "assigned",
        submitted_at: isDraft ? null : iso(now - 3 * 864e5),
      })
      .select("id")
      .single();
    const projectId = project.id;

    // Team members (the leader is the first row, role team_leader)
    const memberRows = p.members.map((name, i) => ({
      project_id: projectId,
      full_name: name,
      student_id: i === 0 ? leaderUid : "806" + String(521000 + nidSeq + i),
      national_id: i === 0 ? leaderNid : nid(),
      email: i === 0 ? p.leaderEmail : null,
      role_in_team: i === 0 ? "team_leader" : "member",
    }));
    const { data: members } = await db.from("team_members").insert(memberRows).select("id");

    // Uploaded file metadata (no real storage object — preview will be unavailable)
    if (!isDraft) {
      must("files " + p.key, await db.from("project_files").insert([
        {
          project_id: projectId, file_type: "documentation_pdf", file_name: "documentation.pdf",
          storage_path: `${cycleId}/${projectId}/documentation.pdf`, file_size: 1_500_000,
          mime_type: "application/pdf", uploaded_by: leaderId,
        },
        {
          project_id: projectId, file_type: "source_code_zip", file_name: "source.zip",
          storage_path: `${cycleId}/${projectId}/source.zip`, file_size: 8_500_000,
          mime_type: "application/zip", uploaded_by: leaderId,
        },
      ]));
    }

    // Panel assignments
    for (const ev of p.evaluators) {
      must(`assign ${ev}->${p.key}`, await db.from("panel_assignments").insert({
        project_id: projectId, panel_member_id: panel[ev], assigned_by: adminId, is_active: true,
      }));
    }

    // Discussion scores
    const evaluatorsThatScored =
      p.grading === "full" ? p.evaluators : p.grading === "partial" ? [p.evaluators[0]] : [];

    for (let ei = 0; ei < evaluatorsThatScored.length; ei++) {
      const ev = evaluatorsThatScored[ei];
      const scoreRows = members.map((m, si) => {
        const jitter = (n) => Math.max(0, n - ((ei + si) % 3) * 0.5);
        return {
          project_id: projectId,
          panel_member_id: panel[ev],
          team_member_id: m.id,
          project_document: jitter(5),       // /5
          presentation_quality: jitter(5),   // /5
          scientific_mastery: jitter(4.5),   // /5
          feasibility: Math.max(0, 3 - (si % 2) * 0.5), // /3
          competition: 2 - (ei % 2),         // /2
          submitted_at: iso(now - 1 * 864e5),
        };
      });
      must(`scores ${ev}->${p.key}`, await db.from("student_discussion_scores").insert(scoreRows));
    }

    // Admin-entered supervision + first-semester (only for the fully graded project)
    if (p.grading === "full") {
      const supRows = members.map((m, si) => ({
        project_id: projectId,
        team_member_id: m.id,
        first_semester_score: 9 - (si % 2),      // /10
        supervision_score: 28 - (si % 3),        // /30
        entered_by: adminId,
      }));
      must(`supervision ${p.key}`, await db.from("student_supervision_grades").insert(supRows));
    }
  }

  // Eligible-student roster: claimed entries for created leaders + a few OPEN ones
  // so you can test self-registration at /register.
  const openRoster = [
    { university_id: "806599001", national_id: nid(), full_name: "طالب اختبار التسجيل 1" },
    { university_id: "806599002", national_id: nid(), full_name: "طالب اختبار التسجيل 2" },
  ];
  must("roster", await db.from("eligible_students").insert(
    [...claimedRoster, ...openRoster].map((r) => ({
      cycle_id: cycleId,
      university_id: r.university_id,
      national_id: r.national_id,
      full_name: r.full_name,
      claimed_by: r.claimed_by ?? null,
      claimed_at: r.claimed_by ? iso(now) : null,
      created_by: adminId,
    })),
  ));

  console.log("\n✓ Seed complete.\n");
  console.log("Login password for every account:", PASSWORD);
  console.log("\nAccounts:");
  console.log("  Admin:   admin" + SEED_DOMAIN);
  console.log("  Panel:   rabie/mona/khaled/sara/wael" + SEED_DOMAIN);
  console.log("  Students: rana/shahd/mohamed/linda/soheila" + SEED_DOMAIN);
  console.log("\nOpen self-registration university IDs (roster, unclaimed): 806599001, 806599002");
}

await cleanup();
await seed();
process.exit(0);
