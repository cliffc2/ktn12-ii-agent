import { NextResponse } from "next/server";
import { getAgentStatus } from "@/lib/agent/engine";

export async function GET() {
  try {
    const status = getAgentStatus();

    return NextResponse.json(status);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
