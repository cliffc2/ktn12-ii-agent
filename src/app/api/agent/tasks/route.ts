import { NextRequest, NextResponse } from "next/server";
import { enqueueTask } from "@/lib/agent/engine";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

  const where = status ? { status } : {};
  const tasks = await prisma.agentTask.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type, payload, priority, scheduledAt } = body;

  if (!type) {
    return NextResponse.json({ error: "type required" }, { status: 400 });
  }

  const task = await enqueueTask(type, payload || {}, {
    priority: priority || 0,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
  });

  return NextResponse.json({ success: true, task });
}