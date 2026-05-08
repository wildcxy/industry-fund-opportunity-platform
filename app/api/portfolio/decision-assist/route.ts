import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";

export async function GET() {
  try {
    const response = await fetchBackendRoute("/api/portfolio/decision-assist");
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "backend_unavailable",
        valuation: null,
        diagnosis: null,
        tips: [],
        candidates: [],
        message: "后端未连接，组合体检暂不可用。"
      },
      { status: 503 }
    );
  }
}
