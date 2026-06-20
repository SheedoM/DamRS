import { requireRole } from "@/lib/auth/require-role";
import { buildGradesCsv, getGradesReportRows } from "@/lib/admin/grades-report";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole(["admin"]);

  const rows = await getGradesReportRows();
  const csv = buildGradesCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="grades-report.csv"`,
    },
  });
}
