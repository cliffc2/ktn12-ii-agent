import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSwap, updateSwapStatus } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { swapId, preimage } = body;

    if (!swapId || !preimage) {
      return NextResponse.json({ error: "swapId and preimage required" }, { status: 400 });
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

    const computedHash = crypto.createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
    if (computedHash !== swap.hashlock) {
      return NextResponse.json({ error: "Invalid preimage - hash does not match hashlock" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= swap.timelock) {
      return NextResponse.json({ error: "Timelock expired - use refund instead" }, { status: 400 });
    }

    updateSwapStatus(swapId, "claimed");

    return NextResponse.json({
      success: true,
      message: `Claimed! Preimage verified: ${preimage.substring(0, 16)}...`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}