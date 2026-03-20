import prisma from "@/lib/db";
import { log } from "@/lib/agent/logger";

export const SUBSCRIPTION_TIERS = {
  basic: {
    name: "Basic",
    price: 10,
    maxSwitches: 1,
    features: ["1 deadman switch", "Webhook alerts", "10min minimum timeout"],
  },
  pro: {
    name: "Pro",
    price: 30,
    maxSwitches: 5,
    features: ["5 deadman switches", "Webhook + email alerts", "Custom timeouts", "Priority execution"],
  },
  enterprise: {
    name: "Enterprise",
    price: 50,
    maxSwitches: 999,
    features: ["Unlimited switches", "All alert channels", "API access", "Priority execution", "Custom grace periods"],
  },
} as const;

export type SubTier = keyof typeof SUBSCRIPTION_TIERS;

export async function createSubscription(userId: string, tier: SubTier) {
  const tierInfo = SUBSCRIPTION_TIERS[tier];
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const sub = await prisma.subscription.create({
    data: {
      userId,
      tier,
      amount: tierInfo.price,
      status: "active",
      startDate,
      endDate,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { tier },
  });

  await log("info", "guardian", `Subscription created: ${tier} for user ${userId}`, {
    amount: tierInfo.price,
  });

  return sub;
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function checkSwitchLimit(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, current: 0, limit: 0 };

  const tier = (user.tier as SubTier) || "basic";
  const limit = SUBSCRIPTION_TIERS[tier]?.maxSwitches || 1;
  const current = await prisma.deadmanEntry.count({
    where: { userId, status: { in: ["active", "warning", "grace"] } },
  });

  return { allowed: current < limit, current, limit };
}

export async function getSubscriptionStats() {
  const subs = await prisma.subscription.groupBy({
    by: ["tier"],
    _count: true,
    where: { status: "active" },
  });

  const totalRevenue = await prisma.subscription.aggregate({
    where: { status: "active" },
    _sum: { amount: true },
  });

  return {
    byTier: subs.reduce((acc, s) => ({ ...acc, [s.tier]: s._count }), {} as Record<string, number>),
    totalMRR: totalRevenue._sum.amount || 0,
    totalActive: subs.reduce((acc, s) => acc + s._count, 0),
  };
}