import crypto from "crypto";
import type { PriceFeed, ArbitrageOpportunity } from "./types";

const FEE_BPS_PER_SIDE = 10; // 0.1% per side (20bps total round-trip)
const MAX_DATA_AGE_MS = 30_000; // 30 seconds

/**
 * Generate a unique opportunity ID using crypto.randomBytes.
 */
export function generateOpportunityId(): string {
  return `arb-${crypto.randomBytes(8).toString("hex")}-${Date.now()}`;
}

/**
 * Classify the arbitrage type based on the two sources involved.
 */
function classifyType(
  buySource: string,
  sellSource: string
): ArbitrageOpportunity["type"] {
  const lower1 = buySource.toLowerCase();
  const lower2 = sellSource.toLowerCase();

  if (lower1.includes("igra-dex") || lower2.includes("igra-dex")) {
    return "cross-chain";
  }
  return "cross-exchange";
}

/**
 * Compute a confidence score in [0, 1] based on volume and data freshness.
 *
 * - Higher volume on both sides → higher confidence
 * - Fresher data → higher confidence
 */
function computeConfidence(
  buyFeed: PriceFeed,
  sellFeed: PriceFeed,
  now: number
): number {
  // Freshness: decays linearly from 1.0 at 0ms old to 0.0 at MAX_DATA_AGE_MS
  const buyAge = Math.max(0, now - buyFeed.timestamp);
  const sellAge = Math.max(0, now - sellFeed.timestamp);
  const buyFreshness = Math.max(0, 1 - buyAge / MAX_DATA_AGE_MS);
  const sellFreshness = Math.max(0, 1 - sellAge / MAX_DATA_AGE_MS);
  const freshness = (buyFreshness + sellFreshness) / 2;

  // Volume score: use log scale, cap around a reasonable threshold
  const VOLUME_CAP = 1_000_000; // $1M daily volume considered "full" confidence
  const buyVolScore = Math.min(1, Math.log1p(buyFeed.volume24h) / Math.log1p(VOLUME_CAP));
  const sellVolScore = Math.min(1, Math.log1p(sellFeed.volume24h) / Math.log1p(VOLUME_CAP));
  const volumeScore = (buyVolScore + sellVolScore) / 2;

  // Weighted combination: freshness matters more than volume
  return Math.round((freshness * 0.6 + volumeScore * 0.4) * 1000) / 1000;
}

/**
 * Group feeds by their trading pair.
 */
function groupByPair(feeds: PriceFeed[]): Map<string, PriceFeed[]> {
  const groups = new Map<string, PriceFeed[]>();
  for (const feed of feeds) {
    const key = feed.pair.toUpperCase();
    const group = groups.get(key);
    if (group) {
      group.push(feed);
    } else {
      groups.set(key, [feed]);
    }
  }
  return groups;
}

/**
 * Detect arbitrage opportunities across price feeds.
 *
 * Compares all pairs of feeds for the same trading pair.
 * An opportunity exists when one source's ask (buy price) is lower than
 * another source's bid (sell price) by more than `minProfitBps`.
 *
 * Fees are estimated at 0.1% per side (20bps total).
 * Results are sorted by netProfit descending.
 */
export function detectOpportunities(
  feeds: PriceFeed[],
  minProfitBps: number
): ArbitrageOpportunity[] {
  const now = Date.now();
  const opportunities: ArbitrageOpportunity[] = [];
  const grouped = groupByPair(feeds);

  for (const [pair, pairFeeds] of grouped) {
    if (pairFeeds.length < 2) continue;

    for (let i = 0; i < pairFeeds.length; i++) {
      for (let j = 0; j < pairFeeds.length; j++) {
        if (i === j) continue;

        const buyFeed = pairFeeds[i]; // buy at this source's ask
        const sellFeed = pairFeeds[j]; // sell at this source's bid

        const buyPrice = buyFeed.ask;
        const sellPrice = sellFeed.bid;

        if (sellPrice <= buyPrice || buyPrice <= 0) continue;

        const spreadBps = Math.round(((sellPrice - buyPrice) / buyPrice) * 10_000);

        if (spreadBps <= minProfitBps) continue;

        // Estimated profit per unit (before fees)
        const estimatedProfit = sellPrice - buyPrice;

        // Fees: 0.1% on buy side + 0.1% on sell side
        const buyFee = buyPrice * (FEE_BPS_PER_SIDE / 10_000);
        const sellFee = sellPrice * (FEE_BPS_PER_SIDE / 10_000);
        const totalFees = buyFee + sellFee;

        const netProfit = estimatedProfit - totalFees;

        if (netProfit <= 0) continue;

        const confidence = computeConfidence(buyFeed, sellFeed, now);

        opportunities.push({
          id: generateOpportunityId(),
          type: classifyType(buyFeed.source, sellFeed.source),
          buySource: buyFeed.source,
          sellSource: sellFeed.source,
          pair,
          buyPrice,
          sellPrice,
          spreadBps,
          estimatedProfit,
          netProfit,
          confidence,
          timestamp: now,
          status: "detected",
        });
      }
    }
  }

  // Sort by netProfit descending
  opportunities.sort((a, b) => b.netProfit - a.netProfit);

  return opportunities;
}

/**
 * Rank opportunities by confidence-weighted net profit (descending).
 */
export function rankOpportunities(
  opps: ArbitrageOpportunity[]
): ArbitrageOpportunity[] {
  return [...opps].sort(
    (a, b) => b.confidence * b.netProfit - a.confidence * a.netProfit
  );
}
