import { NextResponse } from "next/server";
import { sendHeartbeat, getDeadmanStatus } from "@/lib/store";

export async function POST() {
  sendHeartbeat();
  const status = getDeadmanStatus();
  return NextResponse.json({
    success: true,
    remaining: status.remaining,
    message: `Heartbeat received. Timer reset to ${status.timeoutPeriod}s`,
  });
}