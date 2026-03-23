import type { AgentConfig, AgentEvent, AgentStatus, ArbitrageOpportunity } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { fetchAllPriceFeeds, getRealReferencePrice, getLastKnownPrice } from "./price-feeds";
import { detectOpportunities, rankOpportunities } from "./arbitrage";
import { canTrade } from "./risk-manager";
import { executeTrade } from "./executor";
import {
  getPortfolio,
  recordTrade,
  getRecentTrades,
  getDailyPnl,
  getTotalPnl,
  getWinRate,
  getDailyPnlHistory,
  getTrades,
} from "./portfolio";

let config: AgentConfig = { ...DEFAULT_CONFIG };
let running = false;
let startedAt: number | null = null;
let tickCount = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
let recentOpportunities: ArbitrageOpportunity[] = [];
let activeOpportunities: ArbitrageOpportunity[] = [];
let lastPriceFeeds: import("./types").PriceFeed[] = [];
let errors: string[] = [];

type EventListener = (event: AgentEvent) => void;
const listeners: Set<EventListener> = new Set();

function emit(event: AgentEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      /* ignore listener errors */
    }
  }
}

function addError(msg: string): void {
  errors = [msg, ...errors.slice(0, 49)];
  emit({ type: "error", data: msg, timestamp: Date.now() });
}

async function tick(): Promise<void> {
  tickCount++;
  const tickStart = Date.now();

  try {
    const feeds = await fetchAllPriceFeeds();
    lastPriceFeeds = feeds;

    emit({ type: "price", data: feeds, timestamp: Date.now() });

    if (feeds.length === 0) {
      addError("No price feeds available");
      return;
    }

    const opportunities = detectOpportunities(feeds, config.minProfitBps);
    const ranked = rankOpportunities(opportunities);

    activeOpportunities = ranked.slice(0, 10);
    recentOpportunities = [
      ...ranked.slice(0, 5),
      ...recentOpportunities.slice(0, 45),
    ];

    if (ranked.length > 0) {
      emit({ type: "opportunity", data: ranked.slice(0, 5), timestamp: Date.now() });
    }

    if (config.enabled && ranked.length > 0) {
      const portfolio = getPortfolio();
      const allTrades = getTrades();

      for (const opp of ranked.slice(0, 3)) {
        const check = canTrade(config, portfolio, opp, allTrades);
        if (!check.allowed) {
          continue;
        }

        opp.status = "executing";
        const trade = executeTrade(config, portfolio, opp);
        opp.status = trade.status === "filled" ? "executed" : "failed";

        recordTrade(trade);
        emit({ type: "trade", data: trade, timestamp: Date.now() });

        break;
      }
    }

    emit({
      type: "tick",
      data: { tickCount, duration: Date.now() - tickStart, opportunities: ranked.length },
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    addError(`Tick ${tickCount} error: ${msg}`);
  }
}

export function startAgent(): { success: boolean; message: string } {
  if (running) {
    return { success: false, message: "Agent is already running" };
  }

  running = true;
  startedAt = Date.now();
  tickCount = 0;
  errors = [];

  tick();

  intervalId = setInterval(tick, config.tickIntervalMs);

  emit({ type: "status", data: "started", timestamp: Date.now() });
  return { success: true, message: "Agent started" };
}

export function stopAgent(): { success: boolean; message: string } {
  if (!running) {
    return { success: false, message: "Agent is not running" };
  }

  running = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  emit({ type: "status", data: "stopped", timestamp: Date.now() });
  return { success: true, message: "Agent stopped" };
}

export function getAgentStatus(): AgentStatus {
  const portfolio = getPortfolio();
  const refPrice = getRealReferencePrice();

  if (refPrice) {
    const kasUsd = refPrice;
    const kasEthPrice = getLastKnownPrice("KAS/ETH");
    const ethUsd = kasEthPrice && kasEthPrice > 0 ? kasUsd / kasEthPrice : 0;
    portfolio.totalValueUsd =
      (portfolio.balances.kas || 0) * kasUsd +
      (portfolio.balances.eth || 0) * ethUsd +
      (portfolio.balances.usdt || 0);
    portfolio.totalValueKas =
      kasUsd > 0 ? portfolio.totalValueUsd / kasUsd : 0;
  }

  return {
    running,
    startedAt,
    uptime: running && startedAt ? Date.now() - startedAt : 0,
    tickCount,
    totalPnl: getTotalPnl(),
    dailyPnl: getDailyPnl(),
    dailyPnlHistory: getDailyPnlHistory(),
    winRate: getWinRate(),
    totalTrades: getTrades().length,
    portfolio,
    recentTrades: getRecentTrades(20),
    activeOpportunities,
    recentOpportunities: recentOpportunities.slice(0, 20),
    priceFeeds: lastPriceFeeds,
    errors: errors.slice(0, 10),
  };
}

export function getConfig(): AgentConfig {
  return { ...config };
}

export function updateConfig(updates: Partial<AgentConfig>): AgentConfig {
  config = { ...config, ...updates };

  if (running && intervalId && updates.tickIntervalMs) {
    clearInterval(intervalId);
    intervalId = setInterval(tick, config.tickIntervalMs);
  }

  return { ...config };
}

export function subscribe(listener: EventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isRunning(): boolean {
  return running;
}
