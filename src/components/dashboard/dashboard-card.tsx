import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function DashboardCard({ title, value, detail, icon: Icon }: DashboardCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[rgba(52,126,224,0.12)] text-[var(--brand-blue)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-950">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}
