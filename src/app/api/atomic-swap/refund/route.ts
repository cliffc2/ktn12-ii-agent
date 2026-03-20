import { NextResponse } from "next/server";
import { getSwap, updateSwapStatus } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { swapId } = body;

    if (!swapId) {
      return NextResponse.json({ error: "swapId required" }, { status: 400 });
    }

    const swap = getSwap(swapId);
    if (!swap) {
      return NextResponse.json({ error: "Swap not found" }, { status: 404 });
    }

    if (swap.status === "claimed") {
      return NextResponse.json({ error: "Already claimed" }, { status: 400 });
    }
    if (swap.status === "refunded") {
      return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < swap.timelock) {
      return NextResponse.json(
        { error: `Timelock not expired yet. ${swap.timelock - now}s remaining.` },
        { status: 400 }
      );
    }

    updateSwapStatus(swapId, "refunded");

    return NextResponse.json({
      success: true,
      message: "Refunded! Funds returned to sender.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}