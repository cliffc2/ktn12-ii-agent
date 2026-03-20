import prisma from "@/lib/db";

export type LogLevel = "info" | "warn" | "error" | "trade" | "debug";
export type LogCategory = "agent" | "swap" | "guardian" | "arbitrage" | "gateway" | "treasury" | "bot" | "system";

export async function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: Record<string, unknown>
) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${category}]`;
  if (level === "error") {
    console.error(`${prefix} ${message}`);
  } else if (level === "warn") {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }

  try {
    await prisma.agentLog.create({
      data: {
        level,
        category,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });
  } catch {
    // DB write failed - already logged to console
  }
}

export async function getLogs(opts?: {
  category?: string;
  level?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, string> = {};
  if (opts?.category) where.category = opts.category;
  if (opts?.level) where.level = opts.level;

  return prisma.agentLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts?.limit || 100,
    skip: opts?.offset || 0,
  });
}