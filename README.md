# DamRS - Damietta Review System

Damietta Review System (نظام دمياط لمراجعة المشاريع) - FCAI Graduation Project Audit System.

A comprehensive PWA-based graduation project submission, review, and grading platform designed for the Faculty of Computers and Artificial Intelligence at Damietta University. 

## 🚀 Tech Stack

- **Framework:** Next.js App Router (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend/Auth:** Supabase Auth
- **Database:** Supabase Postgres with Row Level Security (RLS)
- **Storage:** Supabase Storage (Private Buckets)

## ✨ Core Features

- **Role-Based Access Control (RBAC):** Distinct dashboards for `admin`, `student`, and `panel_member`.
- **Student Submission Workflow:** Students can form teams, submit project details, upload documentation/code/presentations, and provide demo links.
- **Admin Management:** Admins control global app settings, grading windows, student rosters, panel assignments, and generate comprehensive grade reports.
- **Panel Member Grading:** Assigned reviewers can securely access project materials and submit standardized evaluation scores.
- **Secure File Storage:** All uploaded project files are stored in private Supabase buckets protected by RLS.

## 🛠️ Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Set the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
   ```
   *Note: `SUPABASE_SERVICE_ROLE_KEY` is required for admins to securely create panel members and students directly from the dashboard.*

3. **Database Migrations:**
   Apply the SQL migrations located in `supabase/migrations/` sequentially (from `0001` to `0010`). This sets up the profiles, schema, RLS policies, storage buckets, and grading infrastructure.

4. **Storage Buckets:**
   The migrations will create three private buckets:
   - `project-documents`
   - `project-source-code`
   - `project-presentations`

5. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🔐 Initial Admin Setup

To access the admin dashboard for the first time, you must manually create the first admin user:

1. Create a user in your Supabase Auth dashboard.
2. Copy that user's UUID.
3. Insert the admin profile via the Supabase SQL editor:

```sql
insert into public.profiles (id, full_name, email, role, department)
values (
  'YOUR_AUTH_USER_UUID',
  'Admin User',
  'admin@example.com',
  'admin',
  'Faculty of Computers and Artificial Intelligence'
);
```
Once this initial admin exists, you can manage all other users, settings, and grading cycles directly from the web interface under `/admin`.

## 🗺️ Application Routes

- `/login` / `/register` - Authentication
- `/admin` - Global administration dashboard
  - `/admin/projects` - View and assign projects
  - `/admin/students` - Manage student rosters
  - `/admin/panel-members` - Manage panel member accounts
  - `/admin/settings` - Configure app settings and cycles
  - `/admin/grading-control` - Manage grading windows and grades
- `/student` - Student workspace
  - `/student/project` - Main project hub (new/edit/submit)
- `/panel` - Panel member workspace
  - `/panel/projects` - View assigned projects and submit evaluations

## 🔒 Supabase Security Settings

Ensure the following API settings are configured in your Supabase project:
- **Enable Data API:** `ON`
- **Automatically expose new tables:** `OFF`
- **Enable automatic RLS:** `ON`
