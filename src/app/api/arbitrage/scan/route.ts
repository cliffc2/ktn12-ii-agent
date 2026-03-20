import { NextResponse } from "next/server";
import { scanArbitrage, getArbitrageStats } from "@/lib/arbitrage/scanner";

export async function GET() {
  const stats = await getArbitrageStats();
  return NextResponse.json(stats);
}

export async function POST() {
  const result = await scanArbitrage();
  return NextResponse.json(result);
}