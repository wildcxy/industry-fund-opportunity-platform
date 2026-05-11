import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";
import { backendUnavailablePayload, isDemoMode } from "@/lib/data-mode";
import { MOCK_DATA_VERSION, MOCK_SNAPSHOT_UPDATED_AT_ISO } from "@/lib/mock-metadata";
import { industryCards } from "@/mock/data";

export async function GET() {
  try {
    const response = await fetchBackendRoute("/api/industries", { revalidate: 60 });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    if (!isDemoMode()) {
      return NextResponse.json(
        {
          ...backendUnavailablePayload("后端未连接，行业真实快照暂不可用；默认模式不使用演示行业兜底。"),
          snapshot: {
            data: {
              industries: [],
              marketOverview: {
                summary: "后端真实快照暂不可用。",
                strongTrendCount: 0,
                lowPositionCount: 0
              }
            }
          }
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "demo_fallback",
      snapshot: {
        updatedAt: MOCK_SNAPSHOT_UPDATED_AT_ISO,
        dataVersion: MOCK_DATA_VERSION,
        data: {
          industries: industryCards,
          marketOverview: {
            summary: "当前处于前端本地兜底数据模式。",
            strongTrendCount: 2,
            lowPositionCount: 1
          }
        }
      }
    });
  }
}
