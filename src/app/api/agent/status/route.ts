import { NextResponse } from "next/server";
import { getAgentStatus, startAgent, stopAgent, isRunning } from "@/lib/agent/engine";

export async function GET() {
  const status = await getAgentStatus();
  return NextResponse.json({ ...status, running: isRunning() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "start") {
    startAgent();
    return NextResponse.json({ success: true, message: "Agent started" });
  }
  if (action === "stop") {
    stopAgent();
    return NextResponse.json({ success: true, message: "Agent stopped" });
  }

  return NextResponse.json({ error: "Invalid action. Use 'start' or 'stop'" }, { status: 400 });
}