import type { Portfolio, Trade } from "./types";

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_BALANCES: Record<string, number> = {
  kas: 10000,
  eth: 5,
  usdt: 1000,
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let balances: Record<string, number> = { ...INITIAL_BALANCES };
let trades: Trade[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfToday(): number {
  return new Date(new Date().setHours(0, 0, 0, 0)).getTime();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return the current portfolio snapshot. */
export function getPortfolio(): Portfolio {
  return {
    balances: { ...balances },
    totalValueKas: 0,
    totalValueUsd: 0,
    lastUpdated: Date.now(),
  };
}

/** Adjust a single currency balance by `delta` (positive or negative). */
export function updateBalance(currency: string, delta: number): void {
  const key = currency.toLowerCase();
  balances[key] = (balances[key] ?? 0) + delta;
}

/**
 * Record a completed trade – updates balances for the pair currencies
 * and stores the trade for later querying.
 */
export function recordTrade(trade: Trade): void {
  trades.push(trade);

  // Derive currencies from the pair, e.g. "KAS/USDT" → base = kas, quote = usdt
  const [base, quote] = trade.pair.split("/").map((c) => c.toLowerCase());

  if (trade.direction === "buy") {
    // Bought base, spent quote
    balances[base] = (balances[base] ?? 0) + trade.amount;
    balances[quote] = (balances[quote] ?? 0) - trade.amount * trade.entryPrice - trade.fees;
  } else {
    // Sold base, received quote
    balances[base] = (balances[base] ?? 0) - trade.amount;
    balances[quote] = (balances[quote] ?? 0) + trade.amount * trade.exitPrice - trade.fees;
  }
}

/** Return every recorded trade. */
export function getTrades(): Trade[] {
  return [...trades];
}

/** Return the N most recent trades (by array order). */
export function getRecentTrades(count: number): Trade[] {
  return trades.slice(-count);
}

/** Sum of PnL for trades executed today (UTC midnight boundary). */
export function getDailyPnl(): number {
  const dayStart = startOfToday();
  return trades
    .filter((t) => t.timestamp >= dayStart)
    .reduce((sum, t) => sum + t.pnl, 0);
}

/** Cumulative PnL across all recorded trades. */
export function getTotalPnl(): number {
  return trades.reduce((sum, t) => sum + t.pnl, 0);
}

/** Percentage of trades with positive PnL (0–100). Returns 0 when no trades. */
export function getWinRate(): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.pnl > 0).length;
  return (wins / trades.length) * 100;
}

/**
 * Aggregate PnL per calendar day across the full trade history.
 * Returns an array sorted by date ascending.
 */
export function getDailyPnlHistory(): Array<{ date: string; pnl: number }> {
  const map = new Map<string, number>();

  for (const trade of trades) {
    const date = new Date(trade.timestamp).toISOString().slice(0, 10);
    map.set(date, (map.get(date) ?? 0) + trade.pnl);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl }));
}

/** Reset portfolio back to initial balances and clear all trades. */
export function resetPortfolio(): void {
  balances = { ...INITIAL_BALANCES };
  trades = [];
}
