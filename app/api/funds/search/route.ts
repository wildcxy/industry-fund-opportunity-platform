import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const limit = searchParams.get("limit") ?? "12";

  try {
    const response = await fetchBackendRoute(`/api/funds/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`);
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "backend_unavailable",
        query,
        items: [],
        message: "后端未连接，真实基金搜索暂不可用。"
      },
      { status: 503 }
    );
  }
}
