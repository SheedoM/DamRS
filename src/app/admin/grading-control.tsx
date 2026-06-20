"use client";

import { useActionState } from "react";

import { toggleGradingAction } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const initialState = { ok: true, message: "" };

export function GradingControl({ isOpen }: { isOpen: boolean }) {
  const [toggleState, toggleAction, togglePending] = useActionState(toggleGradingAction, initialState);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>التقييم والدرجات</CardTitle>
        <Badge tone={isOpen ? "success" : "warning"}>{isOpen ? "باب التقييم مفتوح" : "باب التقييم مغلق"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {!toggleState.ok ? <Alert>{toggleState.message}</Alert> : null}
        {toggleState.ok && toggleState.message ? (
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{toggleState.message}</p>
        ) : null}

        <p className="text-sm text-slate-600">
          عند فتح باب التقييم يستطيع أعضاء اللجنة إدخال الدرجات وتعديلها. عند الإغلاق يفقدون الوصول إلى المشاريع.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <form action={toggleAction}>
            <input type="hidden" name="is_open" value={isOpen ? "false" : "true"} />
            <Button type="submit" variant={isOpen ? "outline" : "default"} disabled={togglePending}>
              {togglePending ? "..." : isOpen ? "إغلاق باب التقييم" : "فتح باب التقييم"}
            </Button>
          </form>
          <a href="/admin/reports/grades" className={cn(buttonVariants({ variant: "outline" }))}>
            تصدير تقرير الدرجات (CSV)
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
