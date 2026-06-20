# Manual Test Scenario

Re-seed any time with `npm run seed` (it wipes only `@gpseed.test` accounts + the
seed cycle, then rebuilds). Then run the app with `npm run dev`.

**Password for every seeded account:** `Password123!`

| Role | Email |
|---|---|
| Admin | `admin@gpseed.test` |
| Panel (supervisor) | `rabie@gpseed.test`, `mona@gpseed.test` |
| Panel (referee) | `khaled@gpseed.test`, `sara@gpseed.test` |
| Panel (committee head) | `wael@gpseed.test` |
| Students (team leaders) | `rana / shahd / mohamed / linda / soheila @gpseed.test` |

### Seeded projects

| Project | Program | Status | Committee (evaluators) | Grading state |
|---|---|---|---|---|
| A — شبكة ذكية ونظام أمان لمراكز البيانات | الذكاء الاصطناعي | assigned | rabie, khaled, sara | **fully graded** + supervision/first-sem entered |
| B — منصة تعليمية ذكية | نظم المعلومات | assigned | mona, khaled, sara | **partial** (only the supervisor scored) |
| C — تطبيق متابعة المرضى عن بُعد | المعلوماتية الطبية | assigned | khaled, rabie, wael | assigned, no scores yet |
| D — نظام كشف التطفل في الشبكات | الأمن السيبراني | submitted | — | submitted, **not assigned** |
| E — روبوت محادثة عربي | علوم الحاسب | draft | — | still a draft |

The grading window is **open** and the submission window is **open**.

---

## 1. Admin

1. Log in as `admin@gpseed.test`. On the **dashboard** confirm the stats cards and the
   **grading control**: badge shows "باب التقييم مفتوح", with buttons to close it,
   announce grades, and export CSV.
2. **المشاريع**: 5 projects listed with Arabic program + status. Open **Project A** →
   "درجات الطلاب" table shows the discussion sum per student (3 evaluators), plus your
   first-semester (10) and supervision (30) inputs and a live **final /100** (~90s).
   Change a value and **Save** → success toast.
3. Open **Project C** (no scores yet) → discussion sums are 0, finals reflect only what
   you type. Open **Project D** → use **أعضاء اللجنة → اختر عضو لجنة** to assign an
   evaluator; it now appears with its type badge.
4. **أعضاء اللجنة**: 5 members, each with the right type (مشرف/محكم/رئيس لجنة).
   **الطلاب**: roster shows the 5 claimed IDs + 2 open ones (`806599001`, `806599002`),
   plus the student accounts and their national IDs.
5. **الإعدادات**: change "الحد الأقصى لعدد أعضاء الفريق" and save.

## 2. Panel member (single discussion form + open/close)

1. Log in as `rabie@gpseed.test`. Dashboard shows assigned = 2, graded = 1 (A), pending = 1 (C).
2. Open **Project A → بدء/تعديل التقييم**: the form is **pre-filled** with your saved scores
   for each student (5 criteria, /20 each). Change a number, **حفظ التقييم** → it persists.
   Reopen and edit again — there is **no post-submit lock** while the window is open.
3. Open **Project C**: empty form; enter the 5 criteria for each student and save.
4. **Toggle test:** as admin, close the grading window. Back as `rabie`, opening a project
   now shows **"باب التقييم مغلق"** and saving is rejected. Reopen it as admin to continue.

## 3. Student (journey ends at upload)

1. Log in as `rana@gpseed.test` (Project A, already submitted). You see only the project
   summary and a **"تم التسليم"** confirmation — **no grade, no review status/stepper**.
2. Log in as `soheila@gpseed.test` (Project E, draft). You can **edit** the project: change
   the program, edit team members (try adding past the configured max → blocked), then
   **submit**. After submitting, the journey ends at "تم التسليم".

## 4. Self-registration (gated by the roster)

1. Log out, go to **/register**.
2. Register with university ID **`806599001`** + any 14-digit national ID + a new email +
   password → success, then log in.
3. Try ID **`806599002`** → also works. Try a made-up ID → "غير معتمد للتسجيل". Try a
   already-used ID (e.g. one of the seeded leaders') → "تم استخدامه من قبل".
   (Registration only works while the submission window is open.)

## 5. Announce + CSV

1. As admin, **إعلان الدرجات النهائية** → grading window auto-closes; announce timestamp shown.
2. **تصدير تقرير الدرجات (CSV)** → opens one **row per student** with: اسم الطالب، الرقم
   الجامعي، الرقم القومي، البرنامج، المشروع، المشرف، الفصل الأول (10)، الإشراف (30)،
   المناقشة (60)، الدرجة النهائية (100). Project A students should total in the 90s; ungraded
   students show 0s. Open in Excel — Arabic headers render correctly (UTF-8 BOM).

> Note: uploaded files are seeded as metadata only (no real storage object), so file
> previews show "رابط المعاينة غير متاح". Everything else is fully interactive.
