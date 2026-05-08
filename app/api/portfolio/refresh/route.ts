import { NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));

  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/portfolio/refresh`, {
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
        message: "后端未连接，无法生成组合体检。"
      },
      { status: 503 }
    );
  }
}
