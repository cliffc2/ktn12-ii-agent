import crypto from "node:crypto";
import { NextResponse } from "next/server";

interface ContractSpec {
  type: string;
  description: string;
  participants: string[];
  conditions: string[];
  timeout?: number;
}

function parseContractPrompt(prompt: string): ContractSpec {
  const lower = prompt.toLowerCase();
  const spec: ContractSpec = {
    type: "custom",
    description: prompt,
    participants: [],
    conditions: [],
  };

  if (lower.includes("escrow")) {
    spec.type = "escrow";
    spec.participants = ["buyer", "seller", "arbiter"];
    spec.conditions.push("release on mutual agreement");
    if (lower.includes("timeout") || lower.includes("refund")) {
      spec.timeout = 1440;
      spec.conditions.push("refund after timeout");
    }
  }

  if (
    lower.includes("time lock") ||
    lower.includes("timelock") ||
    lower.includes("locked vault")
  ) {
    spec.type = "timelock";
    spec.participants = ["owner", "recovery"];
    spec.conditions.push("lock funds until block height");
    if (lower.includes("emergency")) {
      spec.conditions.push("emergency recovery key");
    }
  }

  if (lower.includes("recurring") || lower.includes("mecenas")) {
    spec.type = "recurring";
    spec.participants = ["payer", "recipient"];
    spec.conditions.push("periodic release");
    if (lower.includes("cancel")) {
      spec.conditions.push("payer can cancel");
    }
  }

  if (
    lower.includes("hash lock") ||
    lower.includes("atomic swap") ||
    lower.includes("preimage")
  ) {
    spec.type = "hashlock";
    spec.participants = ["sender", "recipient"];
    spec.conditions.push("claim with preimage");
    spec.timeout = 1440;
    spec.conditions.push("refund on timeout");
  }

  if (
    lower.includes("dead man") ||
    lower.includes("deadman") ||
    lower.includes("heartbeat")
  ) {
    spec.type = "deadman";
    spec.participants = ["owner", "beneficiary"];
    spec.conditions.push("heartbeat required");
    if (lower.includes("timeout")) {
      spec.timeout = 10080;
      spec.conditions.push("claim after inactivity");
    }
  }

  if (lower.includes("vesting")) {
    spec.type = "vesting";
    spec.participants = ["owner", "beneficiary"];
    spec.conditions.push("incremental release");
    if (lower.includes("revoke")) {
      spec.conditions.push("owner can revoke");
    }
  }

  if (spec.type === "custom") {
    spec.conditions.push("custom contract");
  }

  return spec;
}

function generateContractScript(spec: ContractSpec): string {
  const hash160 = (data: string) =>
    crypto
      .createHash("ripemd160")
      .update(crypto.createHash("sha256").update(data).digest())
      .digest("hex")
      .substring(0, 40);

  const participants = spec.participants.map((p) => hash160(p));

  switch (spec.type) {
    case "escrow":
      return `OP_IF OP_2 ${participants.slice(0, 2).join(" ")} OP_2 OP_CHECKMULTISIG OP_ELSE ${spec.timeout || 1440} OP_CHECKSEQUENCEVERIFY OP_DROP OP_ENDIF`;

    case "timelock":
      return `OP_IF ${participants[0]} OP_CHECKSIG OP_ELSE ${spec.timeout || 10080} OP_CHECKLOCKTIMEVERIFY OP_DROP ${participants[1] || "00".repeat(20)} OP_CHECKSIG OP_ENDIF`;

    case "recurring":
      return `OP_IF ${participants[1] || "00".repeat(20)} OP_CHECKSIG OP_ELSE ${participants[0] || "00".repeat(20)} OP_CHECKSIG OP_ENDIF`;

    case "hashlock":
      return `OP_IF OP_HASH160 ${participants[1] || "00".repeat(20)} OP_EQUALVERIFY OP_ELSE ${spec.timeout || 1440} OP_CHECKSEQUENCEVERIFY OP_DROP OP_ENDIF`;

    case "deadman":
      return `OP_IF ${participants[0] || "00".repeat(20)} OP_CHECKSIG OP_ELSE ${spec.timeout || 10080} OP_CHECKSEQUENCEVERIFY OP_DROP ${participants[1] || "00".repeat(20)} OP_EQUALVERIFY OP_CHECKSIG OP_ENDIF`;

    case "vesting":
      return `OP_IF OP_DUP OP_HASH160 ${participants[1] || "00".repeat(20)} OP_EQUALVERIFY OP_CHECKSIG OP_ELSE OP_ENDIF`;

    default:
      return `OP_DUP OP_HASH160 ${participants[0] || "00".repeat(20)} OP_EQUALVERIFY OP_CHECKSIG`;
  }
}

function generateContractName(spec: ContractSpec): string {
  const names: Record<string, string> = {
    escrow: "SmartEscrow",
    timelock: "TimeLockedVault",
    recurring: "RecurringPayment",
    hashlock: "HashLockedSwap",
    deadman: "DeadmanSwitch",
    vesting: "VestingSchedule",
  };
  return names[spec.type] || "CustomContract";
}

function generateEntrypoints(spec: ContractSpec): string[] {
  const entrypoints: Record<string, string[]> = {
    escrow: ["release", "refund"],
    timelock: ["claim", "emergency"],
    recurring: ["receive", "cancel"],
    hashlock: ["claim", "refund"],
    deadman: ["heartbeat", "claim"],
    vesting: ["claim", "revoke"],
  };
  return entrypoints[spec.type] || ["spend"];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const spec = parseContractPrompt(prompt);
    const scriptHex = generateContractScript(spec);
    const scriptHash = crypto
      .createHash("ripemd160")
      .update(Buffer.from(scriptHex, "hex"))
      .digest("hex");

    const contractName = generateContractName(spec);
    const entrypoints = generateEntrypoints(spec);

    return NextResponse.json({
      success: true,
      description: spec.description,
      contractName,
      scriptHex,
      scriptTemplate: scriptHex,
      entrypoints,
      address: `kaspatest:pr${scriptHash}${scriptHash.substring(0, 20)}`,
      spec: {
        type: spec.type,
        participants: spec.participants.length,
        conditions: spec.conditions,
        timeout: spec.timeout,
      },
      note: "AI-generated contract - review before deploying to mainnet",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
