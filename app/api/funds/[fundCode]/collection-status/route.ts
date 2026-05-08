import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ fundCode: string }> }) {
  const { fundCode } = await params;

  try {
    const response = await fetchBackendRoute(`/api/funds/${encodeURIComponent(fundCode)}/collection-status`);
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "backend_unavailable",
        candidate: {
          fundCode,
          candidateStatus: "backend_unavailable",
          taskStatus: null,
          lastSuccessTradeDate: null,
          lastErrorMessage: "后端未连接，无法查询采集状态。"
        }
      },
      { status: 503 }
    );
  }
}
