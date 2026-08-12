import { NextRequest, NextResponse } from "next/server";
import { getVulnerability } from "@/lib/queries";
import { errorResponse } from "@/app/api/search/route";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vulnerability = await getVulnerability(
      decodeURIComponent(params.id)
    );
    if (!vulnerability) {
      return NextResponse.json(
        { error: "not_found", message: "Vulnerability not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ vulnerability });
  } catch (err) {
    return errorResponse(err);
  }
}
