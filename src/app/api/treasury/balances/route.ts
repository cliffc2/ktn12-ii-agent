import { NextResponse } from "next/server";
import { getTreasuryStats, initTreasury, creditWallet, autoSweep } from "@/lib/treasury/wallet";

export async function GET() {
  await initTreasury();
  const stats = await getTreasuryStats();
  return NextResponse.json(stats);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "sweep") {
    const result = await autoSweep();
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "credit") {
    const { currency, type, amount } = body;
    if (!currency || !type || !amount) {
      return NextResponse.json({ error: "currency, type, and amount required" }, { status: 400 });
    }
    await creditWallet(currency, type, amount);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}