import { NextRequest, NextResponse } from "next/server";
import { createSubscription, getUserSubscription, getSubscriptionStats, SUBSCRIPTION_TIERS } from "@/lib/guardian/subscriptions";
import type { SubTier } from "@/lib/guardian/subscriptions";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (userId) {
    const sub = await getUserSubscription(userId);
    return NextResponse.json({ subscription: sub });
  }

  const stats = await getSubscriptionStats();
  return NextResponse.json({ ...stats, tiers: SUBSCRIPTION_TIERS });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { userId, tier } = body;

  if (!userId || !tier) {
    return NextResponse.json({ error: "userId and tier required" }, { status: 400 });
  }

  if (!["basic", "pro", "enterprise"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const sub = await createSubscription(userId, tier as SubTier);
  return NextResponse.json({ success: true, subscription: sub });
}