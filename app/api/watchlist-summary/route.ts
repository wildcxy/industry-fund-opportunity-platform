import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";

export async function GET() {
  try {
    const response = await fetchBackendRoute("/api/watchlist-summary");
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({
      status: "fallback",
      snapshot: {
        tradeDate: "2026-04-21",
        dataVersion: "mock-v1",
        updatedAt: "2026-04-21 10:00",
        items: [
          {
            itemType: "industry",
            itemId: "semiconductor",
            statusLabel: "机会增强",
            latestChange: "资金热度连续抬升"
          },
          {
            itemType: "fund",
            itemId: "f3",
            statusLabel: "估值修复",
            latestChange: "近 20 日表现持续改善"
          }
        ]
      }
    });
  }
}
