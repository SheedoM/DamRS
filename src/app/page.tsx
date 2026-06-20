import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getDashboardPathForRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const result = await getCurrentProfile();

    if (result.status === "missing_session") {
      redirect("/login");
    }

    if (result.status === "missing_profile") {
      redirect("/account/setup");
    }

    if (result.status === "invalid_role") {
      redirect("/unauthorized");
    }

    redirect(getDashboardPathForRole(result.profile.role));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl">
          <Alert>
            Supabase is not configured. Create `.env.local` from `.env.example`, then
            restart the development server.
          </Alert>
        </div>
      </main>
    );
  }
}
