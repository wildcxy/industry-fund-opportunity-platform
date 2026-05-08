import { NextResponse } from "next/server";

import { getFundCompareFallback } from "@/lib/adapters/fund";
import { fetchBackendRoute } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids") ?? "";

  try {
    const response = await fetchBackendRoute(`/api/compare?ids=${encodeURIComponent(ids)}`);
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    const items = getFundCompareFallback(ids.split(",").filter(Boolean));

    return NextResponse.json({
      status: items.length > 0 ? "fallback" : "ready_for_data",
      fundIds: ids.split(",").filter(Boolean),
      snapshot: {
        items
      }
    });
  }
}
