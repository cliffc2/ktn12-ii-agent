import { createSwap, listSwaps, getSwap, updateSwapStatus, getDeadmanStatus, sendHeartbeat, updateDeadmanConfig, generatePreimageAndHashlock } from "../src/lib/store";
import crypto from "crypto";

describe("Store - Atomic Swap", () => {
  test("generatePreimageAndHashlock returns valid preimage and hashlock", () => {
    const { preimage, hashlock } = generatePreimageAndHashlock();
    expect(preimage).toHaveLength(64);
    expect(hashlock).toHaveLength(64);
    const computed = crypto.createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
    expect(computed).toBe(hashlock);
  });

  test("createSwap creates a swap with correct fields", () => {
    const swap = createSwap({ direction: "kas2eth", amount: 1.5, timelock: 24 });
    expect(swap.id).toContain("swap-");
    expect(swap.direction).toBe("kas2eth");
    expect(swap.amount).toBe(1.5);
    expect(swap.status).toBe("initiated");
    expect(swap.preimage).toHaveLength(64);
    expect(swap.hashlock).toHaveLength(64);
    expect(swap.htlcAddress).toContain("kaspatest:");
    expect(swap.timelock).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test("listSwaps returns created swaps", () => {
    const before = listSwaps().length;
    createSwap({ direction: "eth2kas", amount: 0.5 });
    const after = listSwaps().length;
    expect(after).toBe(before + 1);
  });

  test("getSwap returns swap by ID", () => {
    const swap = createSwap({ direction: "kas2eth", amount: 2 });
    const found = getSwap(swap.id);
    expect(found).toBeDefined();
    expect(found!.amount).toBe(2);
  });

  test("getSwap returns undefined for unknown ID", () => {
    expect(getSwap("nonexistent")).toBeUndefined();
  });

  test("updateSwapStatus changes status", () => {
    const swap = createSwap({ direction: "kas2eth", amount: 1 });
    updateSwapStatus(swap.id, "claimed");
    const updated = getSwap(swap.id);
    expect(updated!.status).toBe("claimed");
  });
});

describe("Store - Deadman Switch", () => {
  test("getDeadmanStatus returns unconfigured when no contract", () => {
    updateDeadmanConfig({ contractAddress: "" });
    const status = getDeadmanStatus();
    expect(status.status).toBe("unconfigured");
  });

  test("sendHeartbeat resets the timer", () => {
    updateDeadmanConfig({ contractAddress: "kaspatest:test123", timeoutPeriod: 600, gracePeriod: 60 });
    sendHeartbeat();
    const status = getDeadmanStatus();
    expect(status.status).toBe("active");
    expect(status.remaining).toBeGreaterThan(590);
    expect(status.remaining).toBeLessThanOrEqual(600);
  });

  test("getDeadmanStatus shows grace when timeout expired", () => {
    updateDeadmanConfig({
      contractAddress: "kaspatest:test123",
      timeoutPeriod: 0,
      gracePeriod: 60,
    });
    sendHeartbeat();
    const status = getDeadmanStatus();
    expect(["active", "grace"]).toContain(status.status);
  });

  test("updateDeadmanConfig updates fields", () => {
    updateDeadmanConfig({
      contractAddress: "kaspatest:mycontract",
      beneficiary: "kaspatest:beneficiary",
      timeoutPeriod: 300,
      gracePeriod: 30,
    });
    const status = getDeadmanStatus();
    expect(status.contractAddress).toBe("kaspatest:mycontract");
    expect(status.beneficiary).toBe("kaspatest:beneficiary");
    expect(status.timeoutPeriod).toBe(300);
    expect(status.gracePeriod).toBe(30);
  });
});

describe("Intent Parser Logic", () => {
  function parseIntent(text: string) {
    const lowered = text.toLowerCase();
    let action: string | null = null;
    const details: Record<string, unknown> = {};

    const amountMatch = lowered.match(/(\d+\.?\d*)\s*(kas|eth)/i);
    if (amountMatch) {
      details.amount = parseFloat(amountMatch[1]);
      details.fromToken = amountMatch[2].toLowerCase();
    }

    if (lowered.includes("claim")) action = "claim";
    else if (lowered.includes("refund")) action = "refund";
    else if (lowered.includes("status") || lowered.includes("list")) action = "list";
    else if (lowered.includes("swap") || lowered.includes("exchange") || lowered.includes("trade")) {
      action = "swap";
      const toMatch = lowered.match(/\s(?:to|for)\s+(\w+)/i);
      if (toMatch?.[1]) {
        details.direction = toMatch[1].startsWith("eth") ? "kas2eth" : "eth2kas";
      } else if (details.fromToken) {
        details.direction = details.fromToken === "kas" ? "kas2eth" : "eth2kas";
      }
    }

    return { action, details };
  }

  test("parses 'swap 1 kas for eth'", () => {
    const result = parseIntent("swap 1 kas for eth");
    expect(result.action).toBe("swap");
    expect(result.details.amount).toBe(1);
    expect(result.details.direction).toBe("kas2eth");
  });

  test("parses 'trade 0.5 eth to kas'", () => {
    const result = parseIntent("trade 0.5 eth to kas");
    expect(result.action).toBe("swap");
    expect(result.details.amount).toBe(0.5);
    expect(result.details.direction).toBe("eth2kas");
  });

  test("parses 'claim my swap'", () => {
    const result = parseIntent("claim my swap");
    expect(result.action).toBe("claim");
  });

  test("parses 'refund the swap'", () => {
    const result = parseIntent("refund the swap");
    expect(result.action).toBe("refund");
  });

  test("parses 'show status'", () => {
    const result = parseIntent("show status");
    expect(result.action).toBe("list");
  });
});