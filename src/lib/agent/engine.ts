import prisma from "@/lib/db";
import { log } from "./logger";
import { checkAllSwitches } from "@/lib/guardian/monitor";
import { scanArbitrage } from "@/lib/arbitrage/scanner";
import { processSwapQueue } from "@/lib/swap/executor";

export type AgentState = "idle" | "scanning" | "executing" | "confirming" | "error";

interface AgentStatus {
  state: AgentState;
  uptime: number;
  startedAt: string;
  taskStats: { pending: number; completed: number; failed: number };
  lastCycleAt: string | null;
  cycleCount: number;
  version: string;
}

let agentState: AgentState = "idle";
let startedAt = Date.now();
let lastCycleAt: number | null = null;
let cycleCount = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

const CYCLE_INTERVAL_MS = 15_000;

async function runCycle() {
  if (agentState === "executing") return;

  agentState = "scanning";
  cycleCount++;

  try {
    await processTaskQueue();
    await checkAllSwitches();
    await scanArbitrage();
    await processSwapQueue();

    lastCycleAt = Date.now();
    agentState = "idle";
  } catch (err) {
    agentState = "error";
    await log("error", "agent", `Cycle ${cycleCount} failed: ${(err as Error).message}`);
    agentState = "idle";
  }
}

async function processTaskQueue() {
  const tasks = await prisma.agentTask.findMany({
    where: {
      status: "pending",
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: new Date() } },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 10,
  });

  for (const task of tasks) {
    if (task.attempts >= task.maxRetries) {
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "failed", completedAt: new Date() },
      });
      await log("error", "agent", `Task ${task.id} exceeded max retries`, { type: task.type });
      continue;
    }

    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: "processing", startedAt: new Date(), attempts: task.attempts + 1 },
    });

    try {
      const result = await executeTask(task.type, JSON.parse(task.payload));
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "completed",
          result: JSON.stringify(result),
          completedAt: new Date(),
        },
      });
    } catch (err) {
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "pending" },
      });
      await log("warn", "agent", `Task ${task.id} attempt ${task.attempts + 1} failed`, {
        error: (err as Error).message,
      });
    }
  }
}

async function executeTask(type: string, payload: Record<string, unknown>): Promise<unknown> {
  switch (type) {
    case "heartbeat_check":
      await checkAllSwitches();
      return { checked: true };
    case "arbitrage_scan":
      return await scanArbitrage();
    case "swap_execute":
      return { executed: payload };
    case "notification":
      return await sendNotification(payload);
    default:
      return { unknown: type };
  }
}

async function sendNotification(payload: Record<string, unknown>) {
  const { webhook, message } = payload;
  if (webhook && typeof webhook === "string") {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, timestamp: new Date().toISOString() }),
      });
      return { sent: true, webhook };
    } catch {
      return { sent: false, webhook };
    }
  }
  return { sent: false, reason: "no webhook" };
}

export function startAgent() {
  if (intervalId) return;
  startedAt = Date.now();
  cycleCount = 0;
  agentState = "idle";
  log("info", "agent", "Agent engine started");

  runCycle();
  intervalId = setInterval(runCycle, CYCLE_INTERVAL_MS);
}

export function stopAgent() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  agentState = "idle";
  log("info", "agent", "Agent engine stopped");
}

export function isRunning(): boolean {
  return intervalId !== null;
}

export async function getAgentStatus(): Promise<AgentStatus> {
  const [pending, completed, failed] = await Promise.all([
    prisma.agentTask.count({ where: { status: "pending" } }),
    prisma.agentTask.count({ where: { status: "completed" } }),
    prisma.agentTask.count({ where: { status: "failed" } }),
  ]);

  return {
    state: agentState,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    startedAt: new Date(startedAt).toISOString(),
    taskStats: { pending, completed, failed },
    lastCycleAt: lastCycleAt ? new Date(lastCycleAt).toISOString() : null,
    cycleCount,
    version: "1.0.0",
  };
}

export async function enqueueTask(
  type: string,
  payload: Record<string, unknown>,
  opts?: { priority?: number; scheduledAt?: Date }
) {
  return prisma.agentTask.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      priority: opts?.priority || 0,
      scheduledAt: opts?.scheduledAt || null,
    },
  });
}

const globalAgent = globalThis as unknown as { __agentStarted?: boolean };
if (!globalAgent.__agentStarted) {
  globalAgent.__agentStarted = true;
  startAgent();
}