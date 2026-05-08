import { NextResponse } from "next/server";

import { fetchBackendRoute } from "@/lib/backend-proxy";
import { funds } from "@/mock/data";

export async function GET() {
  try {
    const response = await fetchBackendRoute("/api/funds");
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({
      status: "fallback",
      snapshot: {
        items: funds
      }
    });
  }
}
