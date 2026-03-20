import { NextResponse } from "next/server";
import { getNetworkInfo } from "@/lib/kaspa-api";

export async function GET() {
  const info = await getNetworkInfo();
  return NextResponse.json(info);
}