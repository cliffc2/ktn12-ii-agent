import { NextResponse } from "next/server";
import { refundSwap } from "@/lib/swap/executor";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { swapId } = body;

    if (!swapId) {
      return NextResponse.json({ error: "swapId required" }, { status: 400 });
    }

    const result = await refundSwap(swapId);

    return NextResponse.json({
      success: true,
      message: "Refunded! Funds returned to sender.",
      swap: result,
    });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}