import { NextRequest, NextResponse } from "next/server";
import { fetchAllPrices, getPriceHistory } from "@/lib/arbitrage/scanner";

export async function GET(req: NextRequest) {
  const exchange = req.nextUrl.searchParams.get("exchange") || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;
  const live = req.nextUrl.searchParams.get("live");

  if (live === "true") {
    const prices = await fetchAllPrices();
    return NextResponse.json({ prices });
  }

  const history = await getPriceHistory(exchange, limit);
  return NextResponse.json({ history });
}