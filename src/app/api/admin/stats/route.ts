import { NextResponse } from "next/server";
import { getAgentStatus } from "@/lib/agent/engine";
import { getSwapStats } from "@/lib/swap/executor";
import { getGuardianStats } from "@/lib/guardian/monitor";
import { getSubscriptionStats } from "@/lib/guardian/subscriptions";
import { getArbitrageStats } from "@/lib/arbitrage/scanner";
import { getGatewayStats } from "@/lib/gateway/auth";
import { getTreasuryStats, initTreasury } from "@/lib/treasury/wallet";

export async function GET() {
  await initTreasury();

  const [agent, swaps, guardian, subscriptions, arbitrage, gateway, treasury] = await Promise.all([
    getAgentStatus(),
    getSwapStats(),
    getGuardianStats(),
    getSubscriptionStats(),
    getArbitrageStats(),
    getGatewayStats(),
    getTreasuryStats(),
  ]);

  const totalRevenue =
    (swaps.totalFees || 0) +
    (subscriptions.totalMRR || 0) +
    (arbitrage.totalProfit || 0);

  return NextResponse.json({
    agent,
    swaps,
    guardian,
    subscriptions,
    arbitrage,
    gateway,
    treasury,
    revenue: {
      total: Math.round(totalRevenue * 100) / 100,
      swapFees: swaps.totalFees,
      subscriptionMRR: subscriptions.totalMRR,
      arbitrageProfit: arbitrage.totalProfit,
    },
  });
}