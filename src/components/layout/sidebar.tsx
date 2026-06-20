import Image from "next/image";
import { CalendarClock, Files, GraduationCap, LayoutDashboard, Link2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

import { NavLink } from "./nav-link";

export const navigationByRole: Record<UserRole, { label: string; href: string; icon: typeof LayoutDashboard }[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Projects", href: "/admin/projects", icon: Files },
    { label: "Panel", href: "/admin/panel-members", icon: Users },
    { label: "Assignments", href: "/admin/assignments", icon: Link2 },
    { label: "Submission Window", href: "/admin/submission-window", icon: CalendarClock },
  ],
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Project", href: "/student/project", icon: GraduationCap },
  ],
  panel_member: [
    { label: "Dashboard", href: "/panel", icon: LayoutDashboard },
    { label: "Assigned Projects", href: "/panel/projects", icon: Files },
  ],
};

type SidebarProps = {
  role: UserRole;
};

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex min-h-20 items-center gap-3 border-b border-slate-200 px-5">
        <Image
          src="/brand/fcai-logo.jpg"
          alt="FCAI Damietta logo"
          width={44}
          height={44}
          className="h-11 w-11 rounded-md object-cover"
          priority
        />
        <div>
          <p className="text-sm font-semibold text-slate-950">GP Review</p>
          <p className="text-xs text-slate-500">Damietta FCAI</p>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-4">
        {navigationByRole[role].map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
