import { NextResponse } from "next/server";

import { exportReportExcel } from "@/lib/reports/excel";
import { exportReportPdf } from "@/lib/reports/pdf";
import { reportQuerySchema } from "@/lib/reports/params";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildReportBundle } from "@/services/reporting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function filenameSafe(s: string): string {
  return s.replace(/[^\dA-Za-z_-]+/g, "");
}

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = {
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    office_id: searchParams.get("office_id") ?? "",
    account_id: searchParams.get("account_id") ?? "",
    format: searchParams.get("format") ?? undefined,
  };

  const parsed = reportQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let bundle;
  try {
    bundle = await buildReportBundle(parsed.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Report failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const base = `report-${filenameSafe(bundle.filters.from)}_${filenameSafe(bundle.filters.to)}`;

  if (parsed.data.format === "xlsx") {
    const buf = await exportReportExcel(bundle);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  }

  if (parsed.data.format === "pdf") {
    const buf = await exportReportPdf(bundle);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
      },
    });
  }

  return NextResponse.json(bundle);
}
