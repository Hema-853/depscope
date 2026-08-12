import { NextRequest, NextResponse } from "next/server";
import { searchPackages } from "@/lib/queries";
import { DbConfigError, DbConnectionError } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchPackages(q);
    return NextResponse.json({ results });
  } catch (err) {
    return errorResponse(err);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof DbConfigError) {
    return NextResponse.json(
      { error: "config", message: err.message },
      { status: 500 }
    );
  }
  if (err instanceof DbConnectionError) {
    return NextResponse.json(
      { error: "connection", message: err.message },
      { status: 503 }
    );
  }
  console.error(err);
  return NextResponse.json(
    { error: "unknown", message: "Something went wrong." },
    { status: 500 }
  );
}
