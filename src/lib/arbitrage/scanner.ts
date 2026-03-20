import prisma from "@/lib/db";
import { log } from "@/lib/agent/logger";

interface PriceData {
  exchange: string;
  pair: string;
  price: number;
  volume?: number;
}

const EXCHANGES = [
  { name: "coingecko", url: "https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd" },
  { name: "kucoin", url: "https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=KAS-USDT" },
  { name: "mexc", url: "https://api.mexc.com/api/v3/ticker/price?symbol=KASUSDT" },
];

const MIN_SPREAD_PERCENT = 0.5;
const MAX_TRADE_SIZE = 10000;
const DAILY_LOSS_LIMIT = 50;

let settings = {
  minSpread: MIN_SPREAD_PERCENT,
  maxTradeSize: MAX_TRADE_SIZE,
  dailyLossLimit: DAILY_LOSS_LIMIT,
  enabled: true,
};

export function getArbitrageSettings() {
  return { ...settings };
}

export function updateArbitrageSettings(s: Partial<typeof settings>) {
  settings = { ...settings, ...s };
  return settings;
}

async function fetchPrice(exchange: typeof EXCHANGES[number]): Promise<PriceData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(exchange.url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    switch (exchange.name) {
      case "coingecko":
        return { exchange: "coingecko", pair: "KAS/USD", price: data.kaspa?.usd || 0 };
      case "kucoin":
        return {
          exchange: "kucoin",
          pair: "KAS/USDT",
          price: Number.parseFloat(data.data?.price || "0"),
          volume: Number.parseFloat(data.data?.size || "0"),
        };
      case "mexc":
        return { exchange: "mexc", pair: "KAS/USDT", price: Number.parseFloat(data.price || "0") };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export async function fetchAllPrices(): Promise<PriceData[]> {
  const results = await Promise.allSettled(EXCHANGES.map(fetchPrice));
  const prices: PriceData[] = [];

  for (const r of results) {
    if (r.status === "fulfilled" && r.value && r.value.price > 0) {
      prices.push(r.value);

      await prisma.priceFeed.create({
        data: {
          exchange: r.value.exchange,
          pair: r.value.pair,
          price: r.value.price,
          volume: r.value.volume || null,
        },
      });
    }
  }

  return prices;
}

export async function scanArbitrage(): Promise<{
  prices: PriceData[];
  opportunities: Array<{ buy: string; sell: string; spread: number; profit: number }>;
}> {
  if (!settings.enabled) return { prices: [], opportunities: [] };

  const prices = await fetchAllPrices();
  if (prices.length < 2) return { prices, opportunities: [] };

  const opportunities: Array<{ buy: string; sell: string; spread: number; profit: number }> = [];

  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      const low = prices[i].price < prices[j].price ? prices[i] : prices[j];
      const high = prices[i].price >= prices[j].price ? prices[i] : prices[j];

      const spread = ((high.price - low.price) / low.price) * 100;

      if (spread >= settings.minSpread) {
        const tradeAmount = Math.min(settings.maxTradeSize, 1000);
        const kasAmount = tradeAmount / low.price;
        const profit = kasAmount * (high.price - low.price);

        opportunities.push({
          buy: low.exchange,
          sell: high.exchange,
          spread: Math.round(spread * 100) / 100,
          profit: Math.round(profit * 100) / 100,
        });

        await prisma.arbitrageTrade.create({
          data: {
            buyExchange: low.exchange,
            sellExchange: high.exchange,
            pair: "KAS/USDT",
            buyPrice: low.price,
            sellPrice: high.price,
            spread,
            amount: kasAmount,
            profit,
            status: "detected",
          },
        });

        await log("trade", "arbitrage", `Opportunity: Buy ${low.exchange} $${low.price} → Sell ${high.exchange} $${high.price} (${spread.toFixed(2)}%)`, {
          profit,
        });
      }
    }
  }

  return { prices, opportunities };
}

export async function getArbitrageStats() {
  const [total, detected, completed, totalProfit] = await Promise.all([
    prisma.arbitrageTrade.count(),
    prisma.arbitrageTrade.count({ where: { status: "detected" } }),
    prisma.arbitrageTrade.count({ where: { status: "completed" } }),
    prisma.arbitrageTrade.aggregate({
      where: { status: "completed" },
      _sum: { profit: true },
    }),
  ]);

  const recentPrices = await prisma.priceFeed.findMany({
    orderBy: { timestamp: "desc" },
    take: 10,
    distinct: ["exchange"],
  });

  return {
    total,
    detected,
    completed,
    totalProfit: totalProfit._sum.profit || 0,
    recentPrices,
  };
}

export async function getPriceHistory(exchange?: string, limit = 100) {
  const where = exchange ? { exchange } : {};
  return prisma.priceFeed.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}