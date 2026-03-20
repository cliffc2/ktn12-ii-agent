import { NextRequest, NextResponse } from "next/server";
import { listSwapOrders, getOrderBook, getSwapStats } from "@/lib/swap/executor";

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view");

  if (view === "orderbook") {
    const book = await getOrderBook();
    return NextResponse.json(book);
  }

  if (view === "stats") {
    const stats = await getSwapStats();
    return NextResponse.json(stats);
  }

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const swaps = await listSwapOrders({ status });

  return NextResponse.json({
    swaps: swaps.map((s) => ({
      id: s.id,
      direction: s.direction,
      amount: s.amount,
      fee: s.fee,
      feeRate: s.feeRate,
      status: s.status,
      htlcAddress: s.htlcAddress,
      hashlock: s.hashlock,
      timelock: s.timelock,
      created: s.createdAt,
    })),
  });
}