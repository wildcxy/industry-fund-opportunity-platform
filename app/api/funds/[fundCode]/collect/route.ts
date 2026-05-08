import { NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend-proxy";

export async function POST(_request: Request, { params }: { params: Promise<{ fundCode: string }> }) {
  const { fundCode } = await params;

  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/funds/${encodeURIComponent(fundCode)}/collect`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "backend_unavailable",
        message: "后端未连接，无法触发真实基金采集。"
      },
      { status: 503 }
    );
  }
}
