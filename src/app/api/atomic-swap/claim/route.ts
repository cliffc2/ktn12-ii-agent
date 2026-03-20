import { NextResponse } from "next/server";
import { claimSwap } from "@/lib/swap/executor";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { swapId, preimage } = body;

    if (!swapId || !preimage) {
      return NextResponse.json({ error: "swapId and preimage required" }, { status: 400 });
    }

    const result = await claimSwap(swapId, preimage);

    return NextResponse.json({
      success: true,
      message: `Claimed! Preimage verified: ${preimage.substring(0, 16)}...`,
      swap: result,
    });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}