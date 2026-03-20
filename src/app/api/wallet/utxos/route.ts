import { type NextRequest, NextResponse } from "next/server";
import { getUTXOs } from "@/lib/kaspa-api";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }
  const result = await getUTXOs(address);
  return NextResponse.json(result);
}