import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ fundCode: string }> }) {
  const { fundCode } = await params;

  try {
    const response = await fetchBackendRoute(`/api/funds/${encodeURIComponent(fundCode)}/holdings`);
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "backend_unavailable",
        fundCode,
        holdings: [],
        rebalanceInference: [],
        disclaimer: "后端未连接，暂无法读取持仓与调仓推测。"
      },
      { status: 503 }
    );
  }
}
