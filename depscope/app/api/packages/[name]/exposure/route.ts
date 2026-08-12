import { NextRequest, NextResponse } from "next/server";
import { getPackageExposure } from "@/lib/queries";
import { errorResponse } from "@/app/api/search/route";

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const data = await getPackageExposure(decodeURIComponent(params.name));
    if (!data) {
      return NextResponse.json(
        { error: "not_found", message: "Package not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
