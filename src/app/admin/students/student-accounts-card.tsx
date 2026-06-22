"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StudentAccount } from "@/lib/admin/students";

export function StudentAccountsCard({ students }: { students: StudentAccount[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? students.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.full_name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.student_id?.toLowerCase().includes(q) ||
          s.national_id?.toLowerCase().includes(q)
        );
      })
    : students;

  return (
    <Card data-tour="students-main">
      <CardHeader>
        <CardTitle>حسابات الطلاب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          تُنشأ حسابات قادة الفرق تلقائيًا عند تسجيلهم الذاتي بعد إنشاء مشاريعهم من صفحة المشاريع.
        </p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم، البريد، الرقم الجامعي أو القومي..."
        />
        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((student) => (
              <div key={student.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-950">{student.full_name}</p>
                <p className="text-sm text-slate-500">{student.email}</p>
                <p className="text-sm text-slate-500">
                  الرقم الجامعي: {student.student_id || "—"} • الرقم القومي: {student.national_id || "—"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              {query.trim() ? "لا توجد نتائج مطابقة." : "لا توجد حسابات طلاب بعد."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
