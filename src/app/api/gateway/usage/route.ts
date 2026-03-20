import { NextResponse } from "next/server";
import { getGatewayStats } from "@/lib/gateway/auth";

export async function GET() {
  const stats = await getGatewayStats();
  return NextResponse.json(stats);
}