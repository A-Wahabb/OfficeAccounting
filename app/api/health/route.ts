import { NextResponse } from "next/server";

import type { HealthResponse } from "@/types/api";

export const dynamic = "force-dynamic";

export function GET(): NextResponse<HealthResponse> {
  const body: HealthResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
