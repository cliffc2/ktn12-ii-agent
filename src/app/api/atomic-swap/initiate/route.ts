import { NextResponse } from "next/server";
import { createSwap } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { direction, amount, timelock, rate, counterparty } = body;

    if (!direction || !amount) {
      return NextResponse.json({ error: "direction and amount required" }, { status: 400 });
    }

    const swap = createSwap({ direction, amount, timelock, rate, counterparty });

    return NextResponse.json({
      success: true,
      swapId: swap.id,
      preimage: swap.preimage,
      hashlock: swap.hashlock,
      htlcAddress: swap.htlcAddress,
      timelock: swap.timelock,
      status: swap.status,
      message: `Send ${amount} ${direction === "kas2eth" ? "KAS" : "ETH"} to the HTLC address`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}