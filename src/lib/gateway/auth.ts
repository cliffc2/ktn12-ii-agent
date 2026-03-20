import crypto from "crypto";
import prisma from "@/lib/db";
import { log } from "@/lib/agent/logger";

export const API_TIERS = {
  free: { name: "Free", reqLimit: 100, price: 0, ratePerSecond: 1 },
  developer: { name: "Developer", reqLimit: 10000, price: 20, ratePerSecond: 10 },
  pro: { name: "Pro", reqLimit: 1000000, price: 100, ratePerSecond: 50 },
} as const;

export type ApiTier = keyof typeof API_TIERS;

export function generateApiKey(): string {
  return `ktn12_${crypto.randomBytes(24).toString("hex")}`;
}

export async function createUser(data: { email?: string; telegramId?: string; tier?: string }) {
  const user = await prisma.user.create({
    data: {
      email: data.email || null,
      telegramId: data.telegramId || null,
      tier: data.tier || "free",
    },
  });

  const key = generateApiKey();
  const tierName = (data.tier as ApiTier) || "free";
  const tierInfo = API_TIERS[tierName];

  await prisma.apiKey.create({
    data: {
      key,
      userId: user.id,
      tier: tierName,
      reqLimit: tierInfo.reqLimit,
    },
  });

  await log("info", "gateway", `User ${user.id} created with ${tierName} tier`);
  return { user, apiKey: key };
}

export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  tier?: string;
  remaining?: number;
}> {
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.active) {
    return { valid: false };
  }

  const remaining = apiKey.reqLimit - apiKey.reqCount;
  if (remaining <= 0) {
    return { valid: false, userId: apiKey.userId, tier: apiKey.tier, remaining: 0 };
  }

  return {
    valid: true,
    userId: apiKey.userId,
    tier: apiKey.tier,
    remaining,
  };
}

export async function trackUsage(
  apiKeyStr: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number
) {
  const apiKey = await prisma.apiKey.findUnique({ where: { key: apiKeyStr } });
  if (!apiKey) return;

  await prisma.apiKey.update({
    where: { key: apiKeyStr },
    data: { reqCount: apiKey.reqCount + 1 },
  });

  await prisma.apiUsage.create({
    data: {
      apiKeyId: apiKey.id,
      endpoint,
      method,
      statusCode,
      responseTime,
    },
  });
}

export async function resetDailyLimits() {
  await prisma.apiKey.updateMany({
    data: { reqCount: 0 },
  });
  await log("info", "gateway", "Daily API limits reset");
}

export async function getGatewayStats() {
  const [totalKeys, activeKeys, totalRequests] = await Promise.all([
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { active: true } }),
    prisma.apiUsage.count(),
  ]);

  const usageByTier = await prisma.apiKey.groupBy({
    by: ["tier"],
    _count: true,
    _sum: { reqCount: true },
  });

  const recentUsage = await prisma.apiUsage.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { apiKey: { select: { tier: true, userId: true } } },
  });

  return {
    totalKeys,
    activeKeys,
    totalRequests,
    usageByTier: usageByTier.map((u) => ({
      tier: u.tier,
      count: u._count,
      totalReqs: u._sum.reqCount || 0,
    })),
    recentUsage,
  };
}

export async function listApiKeys(userId?: string) {
  const where = userId ? { userId } : {};
  return prisma.apiKey.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      key: true,
      tier: true,
      active: true,
      reqCount: true,
      reqLimit: true,
      createdAt: true,
      userId: true,
    },
  });
}

export async function revokeApiKey(keyId: string) {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { active: false },
  });
  await log("info", "gateway", `API key ${keyId} revoked`);
}