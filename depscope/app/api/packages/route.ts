import { NextResponse } from "next/server";
import { listPackagesWithStats } from "@/lib/queries";
import { errorResponse } from "@/app/api/search/route";

export async function GET() {
  try {
    const packages = await listPackagesWithStats();
    return NextResponse.json({ packages });
  } catch (err) {
    return errorResponse(err);
  }
}
