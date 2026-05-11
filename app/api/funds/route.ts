import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";
import { backendUnavailablePayload, isDemoMode } from "@/lib/data-mode";
import { funds } from "@/mock/data";

export async function GET() {
  try {
    const response = await fetchBackendRoute("/api/funds", { revalidate: 60 });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    if (!isDemoMode()) {
      return NextResponse.json(
        {
          ...backendUnavailablePayload("后端未连接，基金真实快照暂不可用；默认模式不使用演示基金兜底。"),
          snapshot: {
            items: []
          }
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "demo_fallback",
      snapshot: {
        items: funds
      }
    });
  }
}
