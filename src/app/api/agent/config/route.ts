import { NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/agent/engine";

export async function GET() {
  try {
    const config = getConfig();

    return NextResponse.json(config);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const updates = await req.json();
    const config = updateConfig(updates);

    return NextResponse.json(config);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
