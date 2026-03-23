import crypto from "crypto";
import type { AgentConfig, ArbitrageOpportunity, Portfolio, Trade } from "./types";
import { calculateTradeSize } from "./risk-manager";

const SLIPPAGE_BASE_BPS = 5;

function generateTradeId(): string {
  return `trade-${crypto.randomBytes(6).toString("hex")}-${Date.now()}`;
}

function simulateSlippage(price: number, slippageTolerance: number): number {
  const bytes = crypto.randomBytes(4);
  const rand = bytes.readUInt32BE(0) / 0x100000000;
  const slippageBps = SLIPPAGE_BASE_BPS * (rand * 2 - 0.5);
  const cappedBps = Math.min(Math.abs(slippageBps), slippageTolerance * 100);
  const direction = slippageBps >= 0 ? 1 : -1;
  return price * (1 + (direction * cappedBps) / 10_000);
}

function simulateExecutionTime(): number {
  const bytes = crypto.randomBytes(4);
  const rand = bytes.readUInt32BE(0) / 0x100000000;
  return Math.round(200 + rand * 1800);
}

export function executeTrade(
  config: AgentConfig,
  portfolio: Portfolio,
  opportunity: ArbitrageOpportunity
): Trade {
  const amount = calculateTradeSize(config, portfolio, opportunity);
  const executionMs = simulateExecutionTime();

  const entryPrice = simulateSlippage(opportunity.buyPrice, config.slippageTolerance);
  const exitPrice = simulateSlippage(opportunity.sellPrice, config.slippageTolerance);

  const buyFee = entryPrice * amount * 0.001;
  const sellFee = exitPrice * amount * 0.001;
  const fees = buyFee + sellFee;

  const grossPnl = (exitPrice - entryPrice) * amount;
  const pnl = grossPnl - fees;
  const pnlBps = entryPrice > 0 ? Math.round((pnl / (entryPrice * amount)) * 10_000) : 0;

  const bytes = crypto.randomBytes(4);
  const successRand = bytes.readUInt32BE(0) / 0x100000000;
  const successRate = 0.85 + opportunity.confidence * 0.12;
  const succeeded = successRand < successRate;

  const trade: Trade = {
    id: generateTradeId(),
    opportunityId: opportunity.id,
    direction: "buy",
    pair: opportunity.pair,
    amount,
    entryPrice,
    exitPrice: succeeded ? exitPrice : entryPrice,
    fees: succeeded ? fees : buyFee * 0.5,
    pnl: succeeded ? pnl : -(buyFee * 0.5),
    pnlBps: succeeded ? pnlBps : -Math.round((buyFee * 0.5) / (entryPrice * amount) * 10_000),
    status: succeeded ? "filled" : "failed",
    executionMs,
    timestamp: Date.now(),
    source: opportunity.buySource,
    destination: opportunity.sellSource,
  };

  return trade;
}

export function executeBatchTrades(
  config: AgentConfig,
  portfolio: Portfolio,
  opportunities: ArbitrageOpportunity[],
  maxTrades: number
): Trade[] {
  const trades: Trade[] = [];
  const toExecute = opportunities.slice(0, maxTrades);

  for (const opp of toExecute) {
    const trade = executeTrade(config, portfolio, opp);
    trades.push(trade);
  }

  return trades;
}
