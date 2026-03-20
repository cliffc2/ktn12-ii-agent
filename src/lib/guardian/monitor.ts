import prisma from "@/lib/db";
import { log } from "@/lib/agent/logger";

export async function createSwitch(data: {
  owner: string;
  beneficiary: string;
  amount?: number;
  timeout?: number;
  gracePeriod?: number;
  label?: string;
  userId?: string;
  tier?: string;
  notifyEmail?: string;
  notifyWebhook?: string;
}) {
  const entry = await prisma.deadmanEntry.create({
    data: {
      owner: data.owner,
      beneficiary: data.beneficiary,
      amount: data.amount || 0,
      timeout: data.timeout || 600,
      gracePeriod: data.gracePeriod || 60,
      label: data.label || "Default Switch",
      userId: data.userId || null,
      tier: data.tier || "basic",
      notifyEmail: data.notifyEmail || null,
      notifyWebhook: data.notifyWebhook || null,
      status: "active",
      lastHeartbeat: new Date(),
    },
  });

  await log("info", "guardian", `Switch ${entry.id} created for ${data.owner}`, {
    beneficiary: data.beneficiary,
    timeout: data.timeout,
  });

  return entry;
}

export async function heartbeat(switchId: string) {
  const entry = await prisma.deadmanEntry.findUnique({ where: { id: switchId } });
  if (!entry) throw new Error("Switch not found");

  const updated = await prisma.deadmanEntry.update({
    where: { id: switchId },
    data: { lastHeartbeat: new Date(), status: "active" },
  });

  await log("info", "guardian", `Heartbeat received for switch ${switchId}`);
  return updated;
}

export async function getSwitchStatus(switchId: string) {
  const entry = await prisma.deadmanEntry.findUnique({ where: { id: switchId } });
  if (!entry) throw new Error("Switch not found");

  const now = Date.now();
  const elapsed = (now - entry.lastHeartbeat.getTime()) / 1000;
  const remaining = Math.max(0, entry.timeout - elapsed);
  const graceRemaining =
    remaining > 0
      ? entry.gracePeriod
      : Math.max(0, entry.gracePeriod - (elapsed - entry.timeout));

  let status: "active" | "warning" | "grace" | "expired" = "active";
  if (remaining <= 0 && graceRemaining <= 0) {
    status = "expired";
  } else if (remaining <= 0) {
    status = "grace";
  } else if (remaining < entry.timeout * 0.2) {
    status = "warning";
  }

  return {
    ...entry,
    remaining: Math.round(remaining),
    graceRemaining: Math.round(graceRemaining),
    computedStatus: status,
  };
}

export async function listSwitches(opts?: { userId?: string; status?: string }) {
  const where: Record<string, unknown> = {};
  if (opts?.userId) where.userId = opts.userId;
  if (opts?.status) where.status = opts.status;

  const entries = await prisma.deadmanEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(entries.map(async (e) => {
    const now = Date.now();
    const elapsed = (now - e.lastHeartbeat.getTime()) / 1000;
    const remaining = Math.max(0, e.timeout - elapsed);
    return { ...e, remaining: Math.round(remaining) };
  }));
}

export async function checkAllSwitches() {
  const switches = await prisma.deadmanEntry.findMany({
    where: { status: { in: ["active", "warning", "grace"] } },
  });

  let alerts = 0;
  let expired = 0;

  for (const sw of switches) {
    const now = Date.now();
    const elapsed = (now - sw.lastHeartbeat.getTime()) / 1000;
    const remaining = Math.max(0, sw.timeout - elapsed);
    const graceRemaining =
      remaining > 0 ? sw.gracePeriod : Math.max(0, sw.gracePeriod - (elapsed - sw.timeout));

    if (remaining <= 0 && graceRemaining <= 0 && sw.status !== "expired") {
      await prisma.deadmanEntry.update({
        where: { id: sw.id },
        data: { status: "expired" },
      });
      expired++;
      await log("warn", "guardian", `Switch ${sw.id} EXPIRED — triggering beneficiary transfer`, {
        owner: sw.owner,
        beneficiary: sw.beneficiary,
        amount: sw.amount,
      });

      if (sw.notifyWebhook) {
        try {
          await fetch(sw.notifyWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "switch_expired",
              switchId: sw.id,
              owner: sw.owner,
              beneficiary: sw.beneficiary,
              amount: sw.amount,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {
          // webhook failed
        }
      }
    } else if (remaining <= 0 && graceRemaining > 0 && sw.status !== "grace") {
      await prisma.deadmanEntry.update({
        where: { id: sw.id },
        data: { status: "grace" },
      });
      alerts++;
      await log("warn", "guardian", `Switch ${sw.id} entered GRACE period`, {
        graceRemaining: Math.round(graceRemaining),
      });
    } else if (remaining > 0 && remaining < sw.timeout * 0.2 && sw.status === "active") {
      await prisma.deadmanEntry.update({
        where: { id: sw.id },
        data: { status: "warning" },
      });
      alerts++;

      if (sw.notifyWebhook) {
        try {
          await fetch(sw.notifyWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "switch_warning",
              switchId: sw.id,
              remaining: Math.round(remaining),
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {
          // webhook failed
        }
      }
    }
  }

  return { checked: switches.length, alerts, expired };
}

export async function getGuardianStats() {
  const [total, active, warning, grace, expired] = await Promise.all([
    prisma.deadmanEntry.count(),
    prisma.deadmanEntry.count({ where: { status: "active" } }),
    prisma.deadmanEntry.count({ where: { status: "warning" } }),
    prisma.deadmanEntry.count({ where: { status: "grace" } }),
    prisma.deadmanEntry.count({ where: { status: "expired" } }),
  ]);

  return { total, active, warning, grace, expired };
}

export async function deleteSwitch(switchId: string) {
  await prisma.deadmanEntry.delete({ where: { id: switchId } });
  await log("info", "guardian", `Switch ${switchId} deleted`);
}