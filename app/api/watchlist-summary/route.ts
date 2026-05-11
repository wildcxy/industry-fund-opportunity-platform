import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";
import { backendUnavailablePayload, isDemoMode } from "@/lib/data-mode";
import { MOCK_DATA_VERSION, MOCK_SNAPSHOT_DATE, MOCK_SNAPSHOT_UPDATED_AT } from "@/lib/mock-metadata";

export async function GET() {
  try {
    const response = await fetchBackendRoute("/api/watchlist-summary", { revalidate: 60 });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    if (!isDemoMode()) {
      return NextResponse.json(
        {
          ...backendUnavailablePayload("后端未连接，观察池摘要暂不可用；默认模式不使用演示摘要兜底。"),
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
        tradeDate: MOCK_SNAPSHOT_DATE,
        dataVersion: MOCK_DATA_VERSION,
        updatedAt: MOCK_SNAPSHOT_UPDATED_AT,
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
