import { NextResponse } from "next/server";
import { checkForUpdate } from "@/lib/update-engine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") === "beta" ? "beta" : "stable";
  const result = await checkForUpdate(channel);
  return NextResponse.json(result);
}
