import crypto from "crypto";

export interface Swap {
  id: string;
  direction: "kas2eth" | "eth2kas";
  preimage: string;
  hashlock: string;
  amount: number;
  rate: number;
  timelock: number;
  htlcAddress: string;
  counterparty: string;
  status: "initiated" | "accepted" | "claimed" | "refunded" | "expired";
  created: number;
}

export interface DeadmanConfig {
  contractAddress: string;
  beneficiary: string;
  timeoutPeriod: number;
  gracePeriod: number;
  ownerKey: string;
  lastHeartbeat: number;
}

const swaps = new Map<string, Swap>();
let swapCounter = 0;

let deadmanConfig: DeadmanConfig = {
  contractAddress: "",
  beneficiary: "",
  timeoutPeriod: 600,
  gracePeriod: 60,
  ownerKey: "",
  lastHeartbeat: Date.now(),
};

export function generatePreimageAndHashlock() {
  const preimage = crypto.randomBytes(32).toString("hex");
  const hashlock = crypto.createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
  return { preimage, hashlock };
}

export function createSwap(data: Partial<Swap>): Swap {
  const id = `swap-${++swapCounter}-${Date.now()}`;
  const { preimage, hashlock } = generatePreimageAndHashlock();
  const timelockSeconds = (data.timelock || 24) * 3600;

  const swap: Swap = {
    id,
    direction: data.direction || "kas2eth",
    preimage,
    hashlock,
    amount: data.amount || 0,
    rate: data.rate || 0.00002,
    timelock: Math.floor(Date.now() / 1000) + timelockSeconds,
    htlcAddress: `kaspatest:pr${hashlock.substring(0, 58)}`,
    counterparty: data.counterparty || "",
    status: "initiated",
    created: Date.now(),
  };

  swaps.set(id, swap);
  return swap;
}

export function getSwap(id: string): Swap | undefined {
  return swaps.get(id);
}

export function listSwaps(): Swap[] {
  return Array.from(swaps.values()).sort((a, b) => b.created - a.created);
}

export function updateSwapStatus(id: string, status: Swap["status"]): Swap | undefined {
  const swap = swaps.get(id);
  if (swap) {
    swap.status = status;
    swaps.set(id, swap);
  }
  return swap;
}

export function getDeadmanConfig(): DeadmanConfig {
  return { ...deadmanConfig };
}

export function updateDeadmanConfig(updates: Partial<DeadmanConfig>): DeadmanConfig {
  deadmanConfig = { ...deadmanConfig, ...updates };
  return { ...deadmanConfig };
}

export function sendHeartbeat(): DeadmanConfig {
  deadmanConfig.lastHeartbeat = Date.now();
  return { ...deadmanConfig };
}

export function getDeadmanStatus() {
  const now = Date.now();
  const elapsed = (now - deadmanConfig.lastHeartbeat) / 1000;
  const remaining = Math.max(0, deadmanConfig.timeoutPeriod - elapsed);
  const graceRemaining = remaining > 0 ? deadmanConfig.gracePeriod : Math.max(0, deadmanConfig.gracePeriod - (elapsed - deadmanConfig.timeoutPeriod));

  let status: "active" | "grace" | "expired" | "unconfigured" = "active";
  if (!deadmanConfig.contractAddress) {
    status = "unconfigured";
  } else if (remaining <= 0 && graceRemaining <= 0) {
    status = "expired";
  } else if (remaining <= 0) {
    status = "grace";
  }

  return {
    status,
    remaining: Math.round(remaining),
    graceRemaining: Math.round(graceRemaining),
    lastHeartbeat: new Date(deadmanConfig.lastHeartbeat).toISOString(),
    timeoutPeriod: deadmanConfig.timeoutPeriod,
    gracePeriod: deadmanConfig.gracePeriod,
    contractAddress: deadmanConfig.contractAddress,
    beneficiary: deadmanConfig.beneficiary,
  };
}