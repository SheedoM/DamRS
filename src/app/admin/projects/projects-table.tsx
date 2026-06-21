"use client";

/* eslint-disable react-hooks/incompatible-library */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  filterAdminProjects,
  getAssignmentStatus,
  type AdminProjectRow,
  type GradingFilter,
  type AssignmentStatus,
  type SubmissionFilter,
} from "@/lib/admin/admin-projects";
import { BulkAssignForm } from "./bulk-assign-form";
import type { PanelMember } from "@/lib/admin/queries";
import { gradingStatusLabel, projectStatusLabel } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  assigned: "مُسند",
  unassigned: "غير مُسند",
};

const columnHelper = createColumnHelper<AdminProjectRow>();

const columns = [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="rounded border-slate-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="rounded border-slate-300"
      />
    ),
  }),
  columnHelper.accessor("project_number", {
    header: "رقم المشروع",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-700">{info.getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("title", {
    header: "المشروع",
    cell: (info) => (
      <div>
        <p className="font-medium text-slate-950">{info.getValue() || "—"}</p>
        <p className="text-xs text-slate-500">{info.row.original.team_leader_name}</p>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "الحالة",
    cell: (info) =>
      info.row.original.awaiting_leader ? (
        <Badge tone="warning">بانتظار القائد</Badge>
      ) : (
        <Badge tone={info.getValue() === "submitted" ? "success" : "info"}>
          {projectStatusLabel(info.getValue())}
        </Badge>
      ),
  }),
  columnHelper.accessor("supervisor_name", {
    header: "المشرف",
  }),
  columnHelper.accessor("active_assignment_count", {
    header: "الإسناد",
    enableSorting: true,
    cell: (info) => (
      <Badge tone={info.getValue() > 0 ? "success" : "warning"}>
        {assignmentStatusLabels[getAssignmentStatus(info.getValue())]}
      </Badge>
    ),
  }),
  columnHelper.accessor("grading_status", {
    id: "grading",
    header: "التقييم",
    enableSorting: true,
    cell: (info) => {
      const status = info.getValue();
      const tone = status === "graded" ? "success" : status === "partial" ? "warning" : "neutral";
      return <Badge tone={tone}>{gradingStatusLabel(status)}</Badge>;
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (info) => (
      <Link
        href={`/admin/projects/${info.row.original.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        فتح
      </Link>
    ),
  }),
];

function normalizeSubmission(value?: string): SubmissionFilter {
  return value === "submitted" || value === "draft" ? value : "all";
}

function normalizeAssignment(value?: string): AssignmentStatus | "all" {
  return value === "assigned" || value === "unassigned" ? value : "all";
}

function normalizeGrading(value?: string): GradingFilter {
  return value === "graded" || value === "partial" || value === "not-graded" ? value : "all";
}

export function AdminProjectsTable({
  projects,
  panelMembers,
  initialFilters = {},
}: {
  projects: AdminProjectRow[];
  panelMembers: PanelMember[];
  initialFilters?: {
    assignmentStatus?: string;
    gradingStatus?: string;
    status?: string;
    submission?: string;
  };
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [status, setStatus] = useState(initialFilters.status || "");
  const [submission, setSubmission] = useState<SubmissionFilter>(normalizeSubmission(initialFilters.submission));
  const [assignment, setAssignment] = useState<AssignmentStatus | "all">(normalizeAssignment(initialFilters.assignmentStatus));
  const [grading, setGrading] = useState<GradingFilter>(normalizeGrading(initialFilters.gradingStatus));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const filteredProjects = useMemo(() => {
    return filterAdminProjects(projects, {
      status: status || undefined,
      submission,
      assignmentStatus: assignment,
      gradingStatus: grading,
    });
  }, [assignment, projects, grading, status, submission]);

  const table = useReactTable({
    data: filteredProjects,
    columns,
    state: { globalFilter, sorting, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="ابحث في المشاريع، البرامج، المشرفين..."
        />
        <select
          value={submission}
          onChange={(event) => setSubmission(normalizeSubmission(event.target.value))}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">كل حالات التسليم</option>
          <option value="submitted">تم التسليم</option>
          <option value="draft">مسودة</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="submitted">تم التسليم</option>
          <option value="assigned">تم التعيين</option>
          <option value="draft_reviewed">مراجعة مبدئية</option>
          <option value="final_reviewed">مراجعة نهائية</option>
          <option value="completed">مكتمل</option>
        </select>
        <select
          value={assignment}
          onChange={(event) => setAssignment(normalizeAssignment(event.target.value))}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">كل حالات الإسناد</option>
          <option value="assigned">مُسند</option>
          <option value="unassigned">غير مُسند</option>
        </select>
        <select
          value={grading}
          onChange={(event) => setGrading(normalizeGrading(event.target.value))}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">كل حالات التقييم</option>
          <option value="graded">مكتمل التقييم</option>
          <option value="partial">قيد التقييم</option>
          <option value="not-graded">لم يُقيَّم</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-semibold">
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          header.column.getCanSort() && "cursor-pointer select-none hover:text-slate-700"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? (
                          header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )
                        ) : null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>
                  لا توجد مشاريع مطابقة للفلاتر الحالية.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      
      {Object.keys(rowSelection).length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-md mt-4">
          <span className="text-sm font-medium text-slate-700">{Object.keys(rowSelection).length} مشروع محدد</span>
          <div className="flex items-center gap-3">
            <BulkAssignForm 
              selectedProjectIds={Object.keys(rowSelection)} 
              panelMembers={panelMembers} 
              onSuccess={() => setRowSelection({})}
            />
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>إلغاء</Button>
          </div>
        </div>
      )}
    </div>
  );
}
