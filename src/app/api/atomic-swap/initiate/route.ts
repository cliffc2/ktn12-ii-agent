import { NextResponse } from "next/server";
import { createSwapOrder } from "@/lib/swap/executor";
import { calculateFee } from "@/lib/swap/fees";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { direction, amount, rate, counterparty, tier, userId } = body;

    if (!direction || !amount) {
      return NextResponse.json({ error: "direction and amount required" }, { status: 400 });
    }

    const feeInfo = calculateFee(amount, tier);
    const swap = await createSwapOrder({ direction, amount, rate, counterparty, tier, userId });

    return NextResponse.json({
      success: true,
      swapId: swap.id,
      preimage: swap.preimage,
      hashlock: swap.hashlock,
      htlcAddress: swap.htlcAddress,
      timelock: swap.timelock,
      fee: feeInfo.fee,
      feeRate: feeInfo.rate,
      feeTier: feeInfo.tierName,
      netAmount: amount - feeInfo.fee,
      status: swap.status,
      message: `Send ${amount} ${direction === "kas2eth" ? "KAS" : "ETH"} to the HTLC address (fee: ${feeInfo.fee.toFixed(6)})`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}