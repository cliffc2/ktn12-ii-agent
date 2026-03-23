import type { AgentConfig, Portfolio, ArbitrageOpportunity, Trade } from "./types";

/**
 * Check whether a trade is allowed given current config, portfolio state,
 * recent trading history, and the opportunity itself.
 */
export function canTrade(
  config: AgentConfig,
  portfolio: Portfolio,
  opportunity: ArbitrageOpportunity,
  recentTrades: Trade[]
): { allowed: boolean; reason?: string } {
  // Check if the pair is enabled
  if (!config.enabledPairs.includes(opportunity.pair)) {
    return { allowed: false, reason: `Pair ${opportunity.pair} is not enabled` };
  }

  // Check confidence threshold (must be > 0.3)
  if (opportunity.confidence <= 0.3) {
    return {
      allowed: false,
      reason: `Confidence ${opportunity.confidence.toFixed(2)} is below threshold 0.3`,
    };
  }

  // Check sufficient balance for trade
  const tradeSize = calculateTradeSize(config, portfolio, opportunity);
  if (tradeSize <= 0) {
    return {
      allowed: false,
      reason: "Insufficient balance for trade",
    };
  }

  // Check daily loss limit — sum today's PnL from recent trades
  const now = Date.now();
  const startOfDay = new Date(now).setHours(0, 0, 0, 0);
  const todayPnl = recentTrades
    .filter((t) => t.timestamp >= startOfDay)
    .reduce((sum, t) => sum + t.pnl, 0);

  if (todayPnl < 0 && Math.abs(todayPnl) >= config.maxDailyLoss) {
    return {
      allowed: false,
      reason: `Daily loss limit reached: ${todayPnl.toFixed(2)} (max ${config.maxDailyLoss})`,
    };
  }

  // Check max open positions (count pending trades)
  const pendingCount = recentTrades.filter((t) => t.status === "pending").length;
  if (pendingCount >= config.maxOpenPositions) {
    return {
      allowed: false,
      reason: `Max open positions reached: ${pendingCount}/${config.maxOpenPositions}`,
    };
  }

  // Check cooldown — time since last trade
  const lastTrade = recentTrades.length > 0
    ? recentTrades.reduce((latest, t) => (t.timestamp > latest.timestamp ? t : latest), recentTrades[0])
    : null;

  if (lastTrade && now - lastTrade.timestamp < config.cooldownMs) {
    const remaining = config.cooldownMs - (now - lastTrade.timestamp);
    return {
      allowed: false,
      reason: `Cooldown active: ${remaining}ms remaining`,
    };
  }

  return { allowed: true };
}

/**
 * Calculate the appropriate trade size based on confidence,
 * available balance, and config limits.
 */
export function calculateTradeSize(
  config: AgentConfig,
  portfolio: Portfolio,
  opportunity: ArbitrageOpportunity
): number {
  // Scale by confidence: size = maxTradeSize * confidence * 0.5
  const scaledSize = config.maxTradeSize * opportunity.confidence * 0.5;

  // Determine the buy currency from the pair (e.g. "KAS/USDT" → buy currency is left side)
  const [baseCurrency] = opportunity.pair.split("/");
  const buyCurrency = baseCurrency.toLowerCase();

  // Ensure sufficient balance in the buy currency
  const availableBalance = portfolio.balances[buyCurrency] ?? 0;
  const size = Math.min(scaledSize, config.maxTradeSize, availableBalance);

  return Math.max(0, size);
}

/**
 * Assess the risk level of a given opportunity based on
 * spread and confidence thresholds.
 */
export function assessRisk(
  opportunity: ArbitrageOpportunity
): "low" | "medium" | "high" {
  if (opportunity.spreadBps > 50 && opportunity.confidence > 0.7) {
    return "low";
  }

  if (opportunity.spreadBps > 30 && opportunity.confidence > 0.5) {
    return "medium";
  }

  return "high";
}
