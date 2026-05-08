import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";
import { industryDetails } from "@/mock/data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const response = await fetchBackendRoute(`/api/industries/${id}`);
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    const detail = industryDetails[id];

    if (!detail) {
      return NextResponse.json({ message: "Industry not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "fallback",
      snapshot: {
        data: detail
      }
    });
  }
}
