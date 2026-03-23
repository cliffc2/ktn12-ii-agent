import crypto from "crypto";

const OPCODES: Record<string, number> = {
  OP_0: 0x00,
  OP_1: 0x51,
  OP_2: 0x52,
  OP_3: 0x53,
  OP_4: 0x54,
  OP_5: 0x55,
  OP_6: 0x56,
  OP_7: 0x57,
  OP_8: 0x58,
  OP_9: 0x59,
  OP_10: 0x5a,
  OP_11: 0x5b,
  OP_12: 0x5c,
  OP_13: 0x5d,
  OP_14: 0x5e,
  OP_15: 0x5f,
  OP_16: 0x60,
  OP_IF: 0x63,
  OP_ELSE: 0x67,
  OP_ENDIF: 0x68,
  OP_VERIFY: 0x69,
  OP_RETURN: 0x6a,
  OP_TOALTSTACK: 0x6b,
  OP_FROMALTSTACK: 0x6c,
  OP_2DROP: 0x6d,
  OP_2DUP: 0x6e,
  OP_3DUP: 0x6f,
  OP_2OVER: 0x70,
  OP_2ROT: 0x71,
  OP_2SWAP: 0x72,
  OP_IFDUP: 0x73,
  OP_DEPTH: 0x74,
  OP_DROP: 0x75,
  OP_DUP: 0x76,
  OP_NIP: 0x77,
  OP_OVER: 0x78,
  OP_PICK: 0x79,
  OP_ROLL: 0x7a,
  OP_ROT: 0x7b,
  OP_SWAP: 0x7c,
  OP_TUCK: 0x7d,
  OP_SIZE: 0x82,
  OP_CAT: 0x7e,
  OP_SUBSTR: 0x7f,
  OP_LEFT: 0x80,
  OP_RIGHT: 0x81,
  OP_NOP: 0x6f,
  OP_CHECKSIG: 0xac,
  OP_CHECKSIGVERIFY: 0xad,
  OP_CHECKMULTISIG: 0xae,
  OP_CHECKMULTISIGVERIFY: 0xaf,
  OP_EQUAL: 0x87,
  OP_EQUALVERIFY: 0x88,
  OP_HASH160: 0xa9,
  OP_HASH256: 0xaa,
  OP_CHECKLOCKTIMEVERIFY: 0xb1,
  OP_CHECKSEQUENCEVERIFY: 0xb2,
  OP_DATA1: 0x4c,
  OP_DATA2: 0x4d,
  OP_DATA3: 0x4e,
};

function isHex(s: string): boolean {
  return /^[0-9a-fA-F]+$/.test(s);
}

function parsePlaceholder(
  placeholder: string,
  context?: Record<string, string>,
): string {
  if (placeholder.startsWith("<") && placeholder.endsWith(">")) {
    const name = placeholder.slice(1, -1);
    if (context?.[name]) {
      return context[name];
    }
    if (name === "pk" || name.includes("_pk")) {
      return "00".repeat(33);
    }
    if (name.includes("pkh")) {
      return "00".repeat(20);
    }
    return "00".repeat(32);
  }
  return placeholder;
}

function compileOpCode(token: string): string {
  const upper = token.toUpperCase();
  if (OPCODES[upper] !== undefined) {
    return OPCODES[upper].toString(16).padStart(2, "0");
  }
  if (isHex(token)) {
    const hex = token.toLowerCase();
    if (hex.length === 1) {
      return `4c${hex}`;
    }
    if (hex.length <= 255) {
      return `4c${hex.length.toString(16).padStart(2, "0")}${hex}`;
    }
    if (hex.length <= 65535) {
      const len = hex.length / 2;
      return `4d${len.toString(16).padStart(4, "0")}${hex}`;
    }
    return `4e${(hex.length / 2).toString(16).padStart(6, "0")}${hex}`;
  }
  return "";
}

function parseScript(script: string, context?: Record<string, string>): string {
  const tokens = script.split(/\s+/).filter((t) => t.length > 0);
  let hex = "";

  for (const token of tokens) {
    if (token.startsWith("<") && token.endsWith(">")) {
      const value = parsePlaceholder(token, context);
      if (value && isHex(value)) {
        const v = value.toLowerCase();
        if (v.length === 2) {
          hex += `4c${v}`;
        } else if (v.length <= 254) {
          hex += `4c${(v.length / 2).toString(16).padStart(2, "0")}${v}`;
        } else if (v.length <= 65534) {
          const len = v.length / 2;
          hex += `4d${len.toString(16).padStart(4, "0")}${v}`;
        } else {
          const len = v.length / 2;
          hex += `4e${len.toString(16).padStart(6, "0")}${v}`;
        }
      }
    } else if (token === "OP_1NEGATE") {
      hex += "4f";
    } else if (token.startsWith("OP_")) {
      hex += compileOpCode(token);
    } else if (isHex(token)) {
      hex += compileOpCode(token);
    }
  }

  return hex;
}

export interface CompileResult {
  success: boolean;
  scriptHex?: string;
  address?: string;
  error?: string;
  warnings?: string[];
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  script: string;
  entrypoints: string[];
  params: string[];
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "p2pkh",
    name: "Pay to Public Key Hash",
    description: "Simple payment to a hash of a public key",
    script: "OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG",
    entrypoints: ["spend"],
    params: ["pkh"],
  },
  {
    id: "p2pk",
    name: "Pay to Public Key",
    description: "Direct payment to a public key",
    script: "<pk> OP_CHECKSIG",
    entrypoints: ["spend"],
    params: ["pk"],
  },
  {
    id: "multisig-2-3",
    name: "Multisig (2-of-3)",
    description: "2-of-3 multi-signature requiring any 2 keys",
    script: "OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG",
    entrypoints: ["spend"],
    params: ["pk1", "pk2", "pk3"],
  },
  {
    id: "multisig-2-2",
    name: "Multisig (2-of-2)",
    description: "2-of-2 multi-signature requiring both keys",
    script: "OP_2 <pk1> <pk2> OP_2 OP_CHECKMULTISIG",
    entrypoints: ["spend"],
    params: ["pk1", "pk2"],
  },
  {
    id: "escrow-2-3",
    name: "Two-Party Escrow",
    description: "Buyer-seller escrow with optional arbiter",
    script:
      "OP_IF OP_2 <buyer_pk> <seller_pk> OP_2 OP_CHECKMULTISIG OP_ELSE <arbiter_pkh> OP_CHECKSIG OP_ENDIF",
    entrypoints: ["release", "dispute"],
    params: ["buyer_pk", "seller_pk", "arbiter_pkh"],
  },
  {
    id: "timelock-vault",
    name: "Time-Locked Vault",
    description: "Funds locked until block height, with emergency recovery",
    script:
      "OP_IF <owner_pk> OP_CHECKSIG OP_ELSE <unlock_height> OP_CHECKLOCKTIMEVERIFY OP_DROP <recovery_pk> OP_CHECKSIG OP_ENDIF",
    entrypoints: ["claim", "emergency"],
    params: ["owner_pk", "recovery_pk", "unlock_height"],
  },
  {
    id: "hashlock-swap",
    name: "Hash-Locked Swap",
    description: "Atomic swap requiring preimage",
    script:
      "OP_HASH160 <hash> OP_EQUALVERIFY OP_IF <recipient_pk> OP_CHECKSIG OP_ELSE <refund_height> OP_CHECKLOCKTIMEVERIFY OP_DROP <sender_pk> OP_CHECKSIG OP_ENDIF",
    entrypoints: ["claim", "refund"],
    params: ["hash", "sender_pk", "recipient_pk", "refund_height"],
  },
  {
    id: "deadman-switch",
    name: "Dead Man's Switch",
    description: "Beneficiary claims after owner inactivity",
    script:
      "OP_IF <owner_pk> OP_CHECKSIG OP_ELSE <timeout_blocks> OP_CHECKSEQUENCEVERIFY OP_DROP <beneficiary_pkh> OP_EQUALVERIFY OP_CHECKSIG OP_ENDIF",
    entrypoints: ["heartbeat", "claim"],
    params: ["owner_pk", "beneficiary_pkh", "timeout_blocks"],
  },
  {
    id: "recurring-payment",
    name: "Recurring Payment (Mecenas)",
    description: "Automatically sends funds at regular intervals",
    script:
      "OP_IF <recipient_pk> OP_CHECKSIG OP_ELSE <payer_pkh> OP_CHECKSIG OP_ENDIF",
    entrypoints: ["receive", "cancel"],
    params: ["payer_pk", "recipient_pk"],
  },
  {
    id: "covenant",
    name: "Simple Covenant",
    description: "Restricts where funds can be spent",
    script:
      "OP_HASH160 <covenant_hash> OP_EQUALVERIFY OP_DUP OP_HASH160 <recipient_pkh> OP_EQUALVERIFY OP_CHECKSIG",
    entrypoints: ["spend"],
    params: ["covenant_hash", "recipient_pkh"],
  },
];

export function compileScript(
  script: string,
  params: Record<string, string> = {},
): CompileResult {
  const warnings: string[] = [];

  const scriptLower = script.toLowerCase();
  if (scriptLower.includes("op_0") && !scriptLower.includes("op_data1")) {
    warnings.push("Consider using OP_DATA1 for pushing empty bytes (BIP-62)");
  }
  if (/<[a-f0-9]+>/i.test(script)) {
    warnings.push("Unresolved placeholders in script");
  }

  try {
    const scriptHex = parseScript(script, params);

    if (!scriptHex || scriptHex.length === 0) {
      return { success: false, error: "Failed to parse script" };
    }

    const scriptBytes = Buffer.from(scriptHex, "hex");
    const hash160 = crypto
      .createHash("ripemd160")
      .update(crypto.createHash("sha256").update(scriptBytes).digest())
      .digest();
    const address = `kaspatest:pr${hash160.toString("hex")}${hash160.toString("hex").slice(0, 20)}`;

    return {
      success: true,
      scriptHex,
      address,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function getTemplate(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id);
}

export function validateScript(scriptHex: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!scriptHex || scriptHex.length % 2 !== 0) {
    errors.push("Invalid hex string");
    return { valid: false, errors };
  }

  try {
    const bytes = Buffer.from(scriptHex, "hex");

    for (let i = 0; i < bytes.length; i++) {
      const op = bytes[i];

      if (op >= 0x01 && op <= 0x4b) {
        const pushSize = op;
        if (i + 1 + pushSize > bytes.length) {
          errors.push(`Push at byte ${i} exceeds script length`);
        }
        i += pushSize;
      } else if (op === 0x4c) {
        if (i + 2 > bytes.length) {
          errors.push("OP_DATA1 missing size byte");
        }
        const size = bytes[i + 1];
        if (i + 2 + size > bytes.length) {
          errors.push("OP_DATA1 push exceeds script length");
        }
        i += size + 1;
      } else if (op === 0x4d) {
        if (i + 3 > bytes.length) {
          errors.push("OP_DATA2 missing size bytes");
        }
        const size = (bytes[i + 1] << 8) | bytes[i + 2];
        if (i + 3 + size > bytes.length) {
          errors.push("OP_DATA2 push exceeds script length");
        }
        i += size + 2;
      } else if (op === 0x4e) {
        if (i + 4 > bytes.length) {
          errors.push("OP_DATA3 missing size bytes");
        }
        const size = (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
        if (i + 4 + size > bytes.length) {
          errors.push("OP_DATA3 push exceeds script length");
        }
        i += size + 3;
      }
    }
  } catch (e) {
    errors.push(`Parse error: ${(e as Error).message}`);
  }

  return { valid: errors.length === 0, errors };
}

export function checkBIP62Compliance(scriptHex: string): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  const bytes = Buffer.from(scriptHex, "hex");

  for (let i = 0; i < bytes.length; i++) {
    const op = bytes[i];

    if (op === 0x00) {
      if (i + 1 < bytes.length) {
        const nextOp = bytes[i + 1];
        if (nextOp !== 0x00 && nextOp < 0x4c) {
          issues.push(
            `Byte ${i}: Using OP_0 (0x00) to push empty bytes - use OP_DATA1 0x00 for BIP-62 compliance`,
          );
        }
      }
    }

    if (op >= 0x01 && op <= 0x4b) {
      const pushSize = op;
      if (pushSize === 1 && i + 1 < bytes.length) {
        const nextByte = bytes[i + 1];
        if (nextByte >= 0x01 && nextByte <= 0x10) {
          issues.push(
            `Byte ${i}: Minimal encoding issue - numbers 1-16 should use OP_1 through OP_16`,
          );
        }
      }
    }
  }

  return { compliant: issues.length === 0, issues };
}
