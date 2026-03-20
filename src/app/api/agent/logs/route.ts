import { NextRequest, NextResponse } from "next/server";
import { getLogs } from "@/lib/agent/logger";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || undefined;
  const level = req.nextUrl.searchParams.get("level") || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 100;

  const logs = await getLogs({ category, level, limit });
  return NextResponse.json({ logs });
}