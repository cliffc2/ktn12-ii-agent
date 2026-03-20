import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      apiKeys: { select: { id: true, key: true, tier: true, active: true, reqCount: true } },
      subscriptions: { where: { status: "active" }, take: 1 },
      _count: { select: { switches: true, swapOrders: true } },
    },
  });

  const totalUsers = await prisma.user.count();

  return NextResponse.json({ users, total: totalUsers });
}