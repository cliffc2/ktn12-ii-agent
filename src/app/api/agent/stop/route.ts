import { NextResponse } from "next/server";
import { stopAgent } from "@/lib/agent/engine";

export async function POST() {
  try {
    const result = stopAgent();

    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
