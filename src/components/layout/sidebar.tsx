import Image from "next/image";
import {
  Files,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/roles";

import { NavLink } from "./nav-link";

export const navigationByRole: Record<UserRole, { label: string; href: string; icon: typeof LayoutDashboard }[]> = {
  admin: [
    { label: "لوحة التحكم", href: "/admin", icon: LayoutDashboard },
    { label: "المشاريع", href: "/admin/projects", icon: Files },
    { label: "أعضاء اللجنة", href: "/admin/panel-members", icon: Users },
    { label: "الطلاب", href: "/admin/students", icon: GraduationCap },
  ],
  student: [
    { label: "مشروعي", href: "/student/project", icon: GraduationCap },
  ],
  panel_member: [
    { label: "المشاريع المسندة", href: "/panel", icon: Files },
    { label: "الإعدادات", href: "/panel/settings", icon: Settings },
  ],
};

type SidebarProps = {
  role: UserRole;
};

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden w-72 border-e border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex min-h-20 items-center gap-3 border-b border-slate-200 px-5">
        <Image
          src="/brand/fcai-logo.jpg"
          alt="شعار كلية الحاسبات والمعلومات بدمياط"
          width={44}
          height={44}
          className="h-11 w-11 rounded-md object-cover"
          priority
        />
        <div className="flex flex-col justify-center text-start">
          <p className="text-xl font-black tracking-tight text-blue-900">DamRS</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Damietta Review System</p>
          <p className="text-xs font-medium text-slate-700">نظام دمياط لمراجعة المشاريع</p>
        </div>
      </div>
      <nav aria-label="التنقل الرئيسي" className="flex-1 space-y-1 px-3 py-4">
        {navigationByRole[role].map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
