import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Toast } from "@/components/ui/toast";
import type { CurrentProfile } from "@/lib/auth/get-current-profile";

type AppShellProps = {
  title: string;
  profile: CurrentProfile;
  children: ReactNode;
};

export function AppShell({ title, profile, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh bg-slate-50">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} profile={profile} role={profile.role} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <Toast />
      </div>
    </div>
  );
}
