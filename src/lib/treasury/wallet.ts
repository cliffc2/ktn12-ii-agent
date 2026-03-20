import prisma from "@/lib/db";
import { log } from "@/lib/agent/logger";

export interface WalletInfo {
  type: "hot" | "cold" | "fees";
  currency: string;
  balance: number;
  address: string;
}

const HOT_WALLET_THRESHOLD = 1000;

export async function initTreasury() {
  const currencies = ["KAS", "ETH", "USDT"];
  const types = ["hot", "cold", "fees"] as const;

  for (const currency of currencies) {
    for (const type of types) {
      const existing = await prisma.treasury.findFirst({
        where: { currency, type },
      });
      if (!existing) {
        await prisma.treasury.create({
          data: {
            currency,
            type,
            balance: 0,
            address: type === "hot" ? `kaspatest:hot_${currency.toLowerCase()}_wallet` : "",
          },
        });
      }
    }
  }
}

export async function getBalance(currency: string, type?: string): Promise<number> {
  const where: Record<string, string> = { currency };
  if (type) where.type = type;

  const entries = await prisma.treasury.findMany({ where });
  return entries.reduce((sum, e) => sum + e.balance, 0);
}

export async function getAllBalances(): Promise<WalletInfo[]> {
  const entries = await prisma.treasury.findMany({
    orderBy: [{ currency: "asc" }, { type: "asc" }],
  });

  return entries.map((e) => ({
    type: e.type as "hot" | "cold" | "fees",
    currency: e.currency,
    balance: e.balance,
    address: e.address,
  }));
}

export async function creditWallet(currency: string, type: string, amount: number) {
  const entry = await prisma.treasury.findFirst({ where: { currency, type } });
  if (entry) {
    await prisma.treasury.update({
      where: { id: entry.id },
      data: { balance: entry.balance + amount },
    });
  } else {
    await prisma.treasury.create({
      data: { currency, type, balance: amount },
    });
  }

  await log("trade", "treasury", `Credited ${amount} ${currency} to ${type} wallet`);
}

export async function debitWallet(currency: string, type: string, amount: number) {
  const entry = await prisma.treasury.findFirst({ where: { currency, type } });
  if (!entry || entry.balance < amount) {
    throw new Error(`Insufficient ${currency} balance in ${type} wallet`);
  }

  await prisma.treasury.update({
    where: { id: entry.id },
    data: { balance: entry.balance - amount },
  });

  await log("trade", "treasury", `Debited ${amount} ${currency} from ${type} wallet`);
}

export async function autoSweep() {
  const hotWallets = await prisma.treasury.findMany({
    where: { type: "hot" },
  });

  let swept = 0;

  for (const hw of hotWallets) {
    if (hw.balance > HOT_WALLET_THRESHOLD) {
      const sweepAmount = hw.balance - HOT_WALLET_THRESHOLD * 0.5;

      const coldWallet = await prisma.treasury.findFirst({
        where: { currency: hw.currency, type: "cold" },
      });

      if (coldWallet) {
        await prisma.treasury.update({
          where: { id: hw.id },
          data: { balance: hw.balance - sweepAmount },
        });
        await prisma.treasury.update({
          where: { id: coldWallet.id },
          data: { balance: coldWallet.balance + sweepAmount },
        });
        swept += sweepAmount;
        await log("trade", "treasury", `Auto-swept ${sweepAmount} ${hw.currency} to cold storage`);
      }
    }
  }

  return { swept };
}

export async function getTreasuryStats() {
  const wallets = await getAllBalances();

  const totals: Record<string, number> = {};
  const byType: Record<string, Record<string, number>> = {};

  for (const w of wallets) {
    totals[w.currency] = (totals[w.currency] || 0) + w.balance;
    if (!byType[w.type]) byType[w.type] = {};
    byType[w.type][w.currency] = (byType[w.type][w.currency] || 0) + w.balance;
  }

  return { totals, byType, wallets };
}

export async function exportCSV(): Promise<string> {
  const logs = await prisma.agentLog.findMany({
    where: { category: "treasury" },
    orderBy: { createdAt: "asc" },
  });

  const lines = ["timestamp,level,message,data"];
  for (const l of logs) {
    lines.push(`${l.createdAt.toISOString()},${l.level},"${l.message}",${l.data || ""}`);
  }

  return lines.join("\n");
}