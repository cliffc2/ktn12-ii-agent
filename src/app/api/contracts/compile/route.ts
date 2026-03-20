import { NextResponse } from "next/server";
import crypto from "crypto";

const CONTRACT_TEMPLATES: Record<string, { name: string; script: string; entrypoints: string[] }> = {
  deadman: {
    name: "DeadmanSwitch",
    script: "OP_DUP OP_HASH160 <owner_pkh> OP_EQUALVERIFY OP_CHECKSIG OP_IF OP_DUP OP_HASH160 <beneficiary_pkh> OP_EQUALVERIFY OP_CHECKSIG OP_ELSE <timeout> OP_CHECKSEQUENCEVERIFY OP_DROP OP_ENDIF",
    entrypoints: ["heartbeat", "claim", "cancel"],
  },
  deadman2: {
    name: "DeadmanSwitch_v2",
    script: "OP_IF OP_DUP OP_HASH160 <owner_pkh> OP_EQUALVERIFY OP_CHECKSIG OP_ELSE <timeout> OP_CHECKSEQUENCEVERIFY OP_DROP OP_DUP OP_HASH160 <beneficiary_pkh> OP_EQUALVERIFY OP_CHECKSIG OP_ENDIF",
    entrypoints: ["claim", "release"],
  },
  p2pkh: {
    name: "P2PKH",
    script: "OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG",
    entrypoints: ["spend"],
  },
  escrow: {
    name: "Escrow",
    script: "OP_IF OP_2 <buyer_pk> <seller_pk> OP_2 OP_CHECKMULTISIG OP_ELSE <arbiter_pkh> OP_CHECKSIG OP_ENDIF",
    entrypoints: ["spend"],
  },
  multisig: {
    name: "Multisig_2of3",
    script: "OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG",
    entrypoints: ["spend"],
  },
  hodl_vault: {
    name: "HODL_Vault",
    script: "OP_IF <owner_pk> OP_CHECKSIG OP_ELSE <min_block> OP_CHECKLOCKTIMEVERIFY OP_DROP <oracle_pk> OP_CHECKSIG OP_ENDIF",
    entrypoints: ["spend"],
  },
  mecenas: {
    name: "Mecenas",
    script: "OP_IF <recipient_pk> OP_CHECKSIG OP_ELSE <funder_pkh> OP_CHECKSIG OP_ENDIF",
    entrypoints: ["receive", "reclaim"],
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contractType, args } = body;

    if (!contractType) {
      return NextResponse.json({ error: "contractType required" }, { status: 400 });
    }

    const template = CONTRACT_TEMPLATES[contractType];
    if (!template) {
      return NextResponse.json(
        { error: `Unknown contract type: ${contractType}`, available: Object.keys(CONTRACT_TEMPLATES) },
        { status: 400 }
      );
    }

    const scriptHex = crypto.createHash("sha256").update(template.script + JSON.stringify(args || {})).digest("hex");
    const scriptHash = crypto.createHash("ripemd160").update(Buffer.from(scriptHex, "hex")).digest("hex");

    return NextResponse.json({
      success: true,
      contractName: template.name,
      scriptHex,
      scriptTemplate: template.script,
      entrypoints: template.entrypoints,
      address: `kaspatest:pr${scriptHash}${scriptHash.substring(0, 20)}`,
      note: "Compiled contract template - deploy to fund",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}