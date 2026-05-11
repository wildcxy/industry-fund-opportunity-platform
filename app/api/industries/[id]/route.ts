import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";
import { backendUnavailablePayload, isDemoMode } from "@/lib/data-mode";
import { MOCK_DATA_VERSION, MOCK_SNAPSHOT_UPDATED_AT_ISO } from "@/lib/mock-metadata";
import { industryDetails } from "@/mock/data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const response = await fetchBackendRoute(`/api/industries/${id}`, { revalidate: 60 });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    if (!isDemoMode()) {
      return NextResponse.json(
        {
          ...backendUnavailablePayload("后端未连接，行业详情真实快照暂不可用；默认模式不使用演示详情兜底。"),
          snapshot: {
            data: null
          }
        },
        { status: 503 }
      );
    }

    const detail = industryDetails[id];

    if (!detail) {
      return NextResponse.json({ message: "Industry not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "demo_fallback",
      snapshot: {
        updatedAt: MOCK_SNAPSHOT_UPDATED_AT_ISO,
        dataVersion: MOCK_DATA_VERSION,
        data: detail
      }
    });
  }
}
