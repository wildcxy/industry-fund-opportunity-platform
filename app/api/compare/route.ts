import { NextResponse } from "next/server";

import { getFundCompareFallback } from "@/lib/adapters/fund";
import { fetchBackendRoute } from "@/lib/backend-proxy";
import { backendUnavailablePayload, isDemoMode } from "@/lib/data-mode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids") ?? "";

  try {
    const response = await fetchBackendRoute(`/api/compare?ids=${encodeURIComponent(ids)}`, { revalidate: 60 });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    if (!isDemoMode()) {
      return NextResponse.json(
        {
          ...backendUnavailablePayload("后端未连接，基金对比真实快照暂不可用；默认模式不使用演示对比兜底。"),
          fundIds: ids.split(",").filter(Boolean),
          snapshot: {
            items: []
          }
        },
        { status: 503 }
      );
    }

    const items = getFundCompareFallback(ids.split(",").filter(Boolean));

    return NextResponse.json({
      status: items.length > 0 ? "demo_fallback" : "ready_for_data",
      fundIds: ids.split(",").filter(Boolean),
      snapshot: {
        items
      }
    });
  }
}
