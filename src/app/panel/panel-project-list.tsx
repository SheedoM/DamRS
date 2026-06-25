"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { getPanelProjectReviewBadge } from "@/lib/panel/panel-projects";
import type { PanelProjectListItem } from "@/lib/panel/queries";

export function PanelProjectList({ projects }: { projects: PanelProjectListItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) =>
      [project.title, project.supervisor_name, ...project.team_member_names].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [projects, search]);

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث بعنوان المشروع أو اسم أي طالب أو المشرف..."
        className="max-w-sm"
      />
      {filtered.map((project) => {
        const reviewBadge = getPanelProjectReviewBadge(project.gradingState);
        return (
          <div
            key={project.id}
            className="flex flex-col gap-4 rounded-md border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-950">{project.title}</h2>
                {/* eslint-disable-next-line react-hooks/purity */}
                {project.assigned_at &&
                Date.now() - new Date(project.assigned_at).getTime() < 48 * 60 * 60 * 1000 ? (
                  <Badge tone="info">جديد</Badge>
                ) : null}
              </div>
              <p className="text-sm text-slate-500">{project.team_leader_name}</p>
              <div className="flex flex-wrap gap-2">
                <Badge tone={reviewBadge.tone}>{reviewBadge.label}</Badge>
                {project.roles.committee_head ? (
                  <Badge tone="success">رئيس اللجنة</Badge>
                ) : project.roles.committee ? (
                  <Badge tone="info">عضو</Badge>
                ) : null}
                {project.roles.supervisor ? <Badge tone="neutral">مشرف</Badge> : null}
              </div>
              <p className="text-xs text-slate-500">تاريخ الإسناد {formatDate(project.assigned_at)}</p>
            </div>
            <Link
              href={`/panel/projects/${project.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start md:self-center")}
            >
              فتح وتقييم
            </Link>
          </div>
        );
      })}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {search.trim() ? `لا توجد نتائج للبحث عن "${search.trim()}".` : "لا توجد مشاريع مطابقة لهذا العرض."}
        </p>
      ) : null}
    </div>
  );
}
