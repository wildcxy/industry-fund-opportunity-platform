import { NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend-proxy";

export async function GET() {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/industries/refresh-news-events/status`, {
      method: "GET",
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
        message: "后端未连接，无法查询行业新闻事件刷新状态。"
      },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const provider = typeof body.provider === "string" ? body.provider : "jin10";
    const limit = typeof body.limit === "number" ? body.limit : 80;
    const params = new URLSearchParams({
      provider,
      limit: String(limit)
    });
    const response = await fetch(`${getBackendBaseUrl()}/api/industries/refresh-news-events?${params.toString()}`, {
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
        message: "后端未连接，无法刷新行业新闻事件。"
      },
      { status: 503 }
    );
  }
}
