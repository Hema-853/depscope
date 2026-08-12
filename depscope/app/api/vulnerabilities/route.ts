import { NextResponse } from "next/server";
import { listVulnerabilities } from "@/lib/queries";
import { errorResponse } from "@/app/api/search/route";

export async function GET() {
  try {
    const vulnerabilities = await listVulnerabilities();
    return NextResponse.json({ vulnerabilities });
  } catch (err) {
    return errorResponse(err);
  }
}
