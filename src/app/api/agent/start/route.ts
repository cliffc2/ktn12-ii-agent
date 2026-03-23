import { NextResponse } from "next/server";
import { startAgent, updateConfig } from "@/lib/agent/engine";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.autoTrade === true) {
      updateConfig({ enabled: true });
    }

    const result = startAgent();

    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
