import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";
import { industryCards } from "@/mock/data";

export async function GET() {
  try {
    const response = await fetchBackendRoute("/api/industries");
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({
      status: "fallback",
      snapshot: {
        updatedAt: "2026-04-21T10:00:00+08:00",
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
