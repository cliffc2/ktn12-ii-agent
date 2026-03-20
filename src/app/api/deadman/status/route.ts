import { NextResponse } from "next/server";
import { getDeadmanStatus } from "@/lib/store";
import { getGuardianStats } from "@/lib/guardian/monitor";

export async function GET() {
  const legacy = getDeadmanStatus();
  const stats = await getGuardianStats();
  return NextResponse.json({ ...legacy, dbStats: stats });
}