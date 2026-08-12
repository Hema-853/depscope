import { NextRequest, NextResponse } from "next/server";
import { getVulnerabilityExposure } from "@/lib/queries";
import { errorResponse } from "@/app/api/search/route";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getVulnerabilityExposure(
      decodeURIComponent(params.id)
    );
    if (!data) {
      return NextResponse.json(
        { error: "not_found", message: "Vulnerability not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
