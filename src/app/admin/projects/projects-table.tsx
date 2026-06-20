"use client";

/* eslint-disable react-hooks/incompatible-library */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  filterAdminProjects,
  getAssignmentStatus,
  type AdminProjectRow,
  type AdminReviewFilter,
  type AssignmentStatus,
  type SubmissionFilter,
} from "@/lib/admin/admin-projects";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<AdminProjectRow>();

const columns = [
  columnHelper.accessor("title", {
    header: "Project",
    cell: (info) => (
      <div>
        <p className="font-medium text-slate-950">{info.getValue()}</p>
        <p className="text-xs text-slate-500">{info.row.original.team_leader_name}</p>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <Badge tone={info.getValue() === "submitted" ? "success" : "info"}>{info.getValue().replaceAll("_", " ")}</Badge>,
  }),
  columnHelper.accessor("department", {
    header: "Department",
  }),
  columnHelper.accessor("supervisor_name", {
    header: "Supervisor",
  }),
  columnHelper.accessor("active_assignment_count", {
    header: "Assignment",
    cell: (info) => (
      <Badge tone={info.getValue() > 0 ? "success" : "warning"}>
        {getAssignmentStatus(info.getValue())}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: "reviews",
    header: "Reviews",
    cell: (info) => (
      <span className="text-sm text-slate-600">
        {info.row.original.completed_final_review_count} / {info.row.original.required_review_count} final
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (info) => (
      <Link
        href={`/admin/projects/${info.row.original.id}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Open
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

function normalizeReview(value?: string): AdminReviewFilter {
  return value === "final-complete" || value === "final-pending" || value === "draft-pending" ? value : "all";
}

export function AdminProjectsTable({
  projects,
  initialFilters = {},
}: {
  projects: AdminProjectRow[];
  initialFilters?: {
    assignmentStatus?: string;
    reviewStatus?: string;
    status?: string;
    submission?: string;
  };
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [status, setStatus] = useState(initialFilters.status || "");
  const [submission, setSubmission] = useState<SubmissionFilter>(normalizeSubmission(initialFilters.submission));
  const [assignment, setAssignment] = useState<AssignmentStatus | "all">(normalizeAssignment(initialFilters.assignmentStatus));
  const [review, setReview] = useState<AdminReviewFilter>(normalizeReview(initialFilters.reviewStatus));

  const filteredProjects = useMemo(() => {
    return filterAdminProjects(projects, {
      status: status || undefined,
      submission,
      assignmentStatus: assignment,
      reviewStatus: review,
    });
  }, [assignment, projects, review, status, submission]);

  const table = useReactTable({
    data: filteredProjects,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search projects, departments, supervisors..."
        />
        <select
          value={submission}
          onChange={(event) => setSubmission(normalizeSubmission(event.target.value))}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">All submissions</option>
          <option value="submitted">Submitted</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="assigned">Assigned</option>
          <option value="draft_reviewed">Draft reviewed</option>
          <option value="final_reviewed">Final reviewed</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={assignment}
          onChange={(event) => setAssignment(normalizeAssignment(event.target.value))}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">All assignments</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <select
          value={review}
          onChange={(event) => setReview(normalizeReview(event.target.value))}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="all">All reviews</option>
          <option value="final-complete">Final complete</option>
          <option value="final-pending">Final pending</option>
          <option value="draft-pending">Draft pending</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                  No projects match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
