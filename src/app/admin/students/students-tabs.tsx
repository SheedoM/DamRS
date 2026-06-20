"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Tab = "accounts" | "roster";

export function StudentsTabs({
  accounts,
  roster,
}: {
  accounts: ReactNode;
  roster: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("accounts");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <Button variant={tab === "accounts" ? "default" : "ghost"} size="sm" onClick={() => setTab("accounts")}>
          حسابات الطلاب
        </Button>
        <Button variant={tab === "roster" ? "default" : "ghost"} size="sm" onClick={() => setTab("roster")}>
          الأرقام الجامعية
        </Button>
      </div>
      {tab === "accounts" ? accounts : roster}
    </div>
  );
}
