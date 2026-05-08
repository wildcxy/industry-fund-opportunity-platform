import { NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  const payload = await request.json();

  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/portfolio/positions`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const responsePayload = await response.json();
    return NextResponse.json(responsePayload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "backend_unavailable",
        message: "后端未连接，无法同步持仓。"
      },
      { status: 503 }
    );
  }
}
