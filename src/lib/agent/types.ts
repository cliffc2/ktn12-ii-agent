/** Configuration for the arbitrage trading agent. */
export interface AgentConfig {
  enabled: boolean;
  tickIntervalMs: number;
  minProfitBps: number;
  maxTradeSize: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  cooldownMs: number;
  slippageTolerance: number;
  enabledPairs: string[];
}

/** A price feed snapshot from a single source. */
export interface PriceFeed {
  source: string;
  pair: string;
  bid: number;
  ask: number;
  spread: number;
  spreadBps: number;
  volume24h: number;
  timestamp: number;
}

/** A detected arbitrage opportunity across sources. */
export interface ArbitrageOpportunity {
  id: string;
  type: "cross-exchange" | "cross-chain" | "triangular";
  buySource: string;
  sellSource: string;
  pair: string;
  buyPrice: number;
  sellPrice: number;
  spreadBps: number;
  estimatedProfit: number;
  netProfit: number;
  confidence: number;
  timestamp: number;
  status: "detected" | "executing" | "executed" | "missed" | "failed";
}

/** A single trade executed by the agent. */
export interface Trade {
  id: string;
  opportunityId: string;
  direction: "buy" | "sell";
  pair: string;
  amount: number;
  entryPrice: number;
  exitPrice: number;
  fees: number;
  pnl: number;
  pnlBps: number;
  status: "pending" | "filled" | "partial" | "failed" | "cancelled";
  executionMs: number;
  timestamp: number;
  source: string;
  destination: string;
}

/** Current portfolio balances and valuations. */
export interface Portfolio {
  balances: Record<string, number>;
  totalValueKas: number;
  totalValueUsd: number;
  lastUpdated: number;
}

/** Full agent runtime status and metrics. */
export interface AgentStatus {
  running: boolean;
  startedAt: number | null;
  uptime: number;
  tickCount: number;
  totalPnl: number;
  dailyPnl: number;
  dailyPnlHistory: { date: string; pnl: number }[];
  winRate: number;
  totalTrades: number;
  portfolio: Portfolio;
  recentTrades: Trade[];
  activeOpportunities: ArbitrageOpportunity[];
  recentOpportunities: ArbitrageOpportunity[];
  priceFeeds: PriceFeed[];
  errors: string[];
}

/** An event emitted by the agent during operation. */
export interface AgentEvent {
  type: "tick" | "opportunity" | "trade" | "error" | "status" | "price";
  data: unknown;
  timestamp: number;
}

export const DEFAULT_CONFIG: AgentConfig = {
  enabled: false,
  tickIntervalMs: 10_000,
  minProfitBps: 30,
  maxTradeSize: 100,
  maxDailyLoss: 50,
  maxOpenPositions: 5,
  cooldownMs: 5_000,
  slippageTolerance: 0.5,
  enabledPairs: ["KAS/USDT", "KAS/ETH"],
};
