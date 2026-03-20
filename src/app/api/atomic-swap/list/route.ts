import { NextResponse } from "next/server";
import { listSwaps } from "@/lib/store";

export async function GET() {
  const swaps = listSwaps().map((s) => ({
    id: s.id,
    direction: s.direction,
    amount: s.amount,
    status: s.status,
    htlcAddress: s.htlcAddress,
    hashlock: s.hashlock,
    timelock: s.timelock,
    created: s.created,
  }));

  return NextResponse.json({ swaps });
}