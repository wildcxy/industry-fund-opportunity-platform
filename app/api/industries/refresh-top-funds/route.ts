import { NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend-proxy";

export async function GET() {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/industries/refresh-top-funds/status`, {
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
        message: "后端未连接，无法查询行业 Top10 基金池刷新状态。"
      },
      { status: 503 }
    );
  }
}

export async function POST() {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/industries/refresh-top-funds`, {
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
        message: "后端未连接，无法刷新行业 Top10 基金池。"
      },
      { status: 503 }
    );
  }
}
