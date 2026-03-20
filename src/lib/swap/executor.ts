import crypto from "crypto";
import prisma from "@/lib/db";
import { log } from "@/lib/agent/logger";
import { calculateFee } from "./fees";

export async function createSwapOrder(data: {
  direction: string;
  amount: number;
  rate?: number;
  counterparty?: string;
  userId?: string;
  tier?: string;
}) {
  const preimage = crypto.randomBytes(32).toString("hex");
  const hashlock = crypto.createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
  const timelockSeconds = 24 * 3600;
  const { fee, rate: feeRate } = calculateFee(data.amount, data.tier);

  const order = await prisma.swapOrder.create({
    data: {
      direction: data.direction,
      amount: data.amount,
      rate: data.rate || 0.00002,
      fee,
      feeRate,
      hashlock,
      preimage,
      htlcAddress: `kaspatest:pr${hashlock.substring(0, 58)}`,
      counterparty: data.counterparty || "",
      timelock: Math.floor(Date.now() / 1000) + timelockSeconds,
      status: "initiated",
      userId: data.userId || null,
    },
  });

  await log("trade", "swap", `Swap ${order.id} initiated: ${data.amount} ${data.direction}`, {
    fee,
    feeRate,
    hashlock,
  });

  return order;
}

export async function claimSwap(swapId: string, preimage: string) {
  const swap = await prisma.swapOrder.findUnique({ where: { id: swapId } });
  if (!swap) throw new Error("Swap not found");
  if (swap.status !== "initiated") throw new Error(`Cannot claim swap in ${swap.status} state`);

  const hash = crypto.createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
  if (hash !== swap.hashlock) throw new Error("Invalid preimage");

  const updated = await prisma.swapOrder.update({
    where: { id: swapId },
    data: { status: "claimed" },
  });

  await creditFeeWallet(swap.fee, swap.direction);
  await log("trade", "swap", `Swap ${swapId} claimed`, { fee: swap.fee });
  return updated;
}

export async function refundSwap(swapId: string) {
  const swap = await prisma.swapOrder.findUnique({ where: { id: swapId } });
  if (!swap) throw new Error("Swap not found");

  const now = Math.floor(Date.now() / 1000);
  if (swap.timelock && now < swap.timelock) {
    throw new Error(`Timelock not expired. ${swap.timelock - now}s remaining`);
  }

  const updated = await prisma.swapOrder.update({
    where: { id: swapId },
    data: { status: "refunded" },
  });

  await log("trade", "swap", `Swap ${swapId} refunded`);
  return updated;
}

export async function listSwapOrders(opts?: { status?: string; userId?: string; limit?: number }) {
  const where: Record<string, unknown> = {};
  if (opts?.status) where.status = opts.status;
  if (opts?.userId) where.userId = opts.userId;

  return prisma.swapOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts?.limit || 50,
  });
}

export async function getOrderBook() {
  const [buyOrders, sellOrders] = await Promise.all([
    prisma.swapOrder.findMany({
      where: { direction: "eth2kas", status: "initiated" },
      orderBy: { rate: "desc" },
      take: 20,
    }),
    prisma.swapOrder.findMany({
      where: { direction: "kas2eth", status: "initiated" },
      orderBy: { rate: "asc" },
      take: 20,
    }),
  ]);

  return { buyOrders, sellOrders };
}

async function creditFeeWallet(fee: number, direction: string) {
  const currency = direction === "kas2eth" ? "KAS" : "ETH";

  const existing = await prisma.treasury.findFirst({
    where: { currency, type: "fees" },
  });

  if (existing) {
    await prisma.treasury.update({
      where: { id: existing.id },
      data: { balance: existing.balance + fee },
    });
  } else {
    await prisma.treasury.create({
      data: { currency, type: "fees", balance: fee },
    });
  }
}

export async function processSwapQueue() {
  const expiredSwaps = await prisma.swapOrder.findMany({
    where: {
      status: "initiated",
      timelock: { lt: Math.floor(Date.now() / 1000) },
    },
  });

  for (const swap of expiredSwaps) {
    await prisma.swapOrder.update({
      where: { id: swap.id },
      data: { status: "expired" },
    });
    await log("info", "swap", `Swap ${swap.id} expired`);
  }

  return { expired: expiredSwaps.length };
}

export async function getSwapStats() {
  const [total, active, claimed, refunded, expired] = await Promise.all([
    prisma.swapOrder.count(),
    prisma.swapOrder.count({ where: { status: "initiated" } }),
    prisma.swapOrder.count({ where: { status: "claimed" } }),
    prisma.swapOrder.count({ where: { status: "refunded" } }),
    prisma.swapOrder.count({ where: { status: "expired" } }),
  ]);

  const feeRevenue = await prisma.swapOrder.aggregate({
    where: { status: "claimed" },
    _sum: { fee: true },
  });

  const volume = await prisma.swapOrder.aggregate({
    _sum: { amount: true },
  });

  return {
    total,
    active,
    claimed,
    refunded,
    expired,
    totalFees: feeRevenue._sum.fee || 0,
    totalVolume: volume._sum.amount || 0,
  };
}