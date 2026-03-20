import { NextResponse } from "next/server";
import { getArbitrageSettings, updateArbitrageSettings } from "@/lib/arbitrage/scanner";

export async function GET() {
  return NextResponse.json(getArbitrageSettings());
}

export async function POST(req: Request) {
  const body = await req.json();
  const updated = updateArbitrageSettings(body);
  return NextResponse.json({ success: true, settings: updated });
}