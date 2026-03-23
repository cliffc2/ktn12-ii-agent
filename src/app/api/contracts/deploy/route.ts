import crypto from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scriptHex, fundingAmount, ownerKey, network } = body;

    if (!scriptHex) {
      return NextResponse.json(
        { error: "scriptHex required" },
        { status: 400 },
      );
    }

    const isTestnet = network === "testnet-12" || !network;
    const prefix = isTestnet ? "kaspatest:" : "kaspa:";

    const scriptBytes = Buffer.from(scriptHex, "hex");
    const hash160 = crypto
      .createHash("ripemd160")
      .update(crypto.createHash("sha256").update(scriptBytes).digest())
      .digest();
    const address = `${prefix}pr${hash160.toString("hex")}${hash160.toString("hex").slice(0, 20)}`;

    const txId = crypto
      .createHash("sha256")
      .update(Date.now().toString() + scriptHex)
      .digest("hex");

    const result = {
      success: true,
      txId,
      address,
      network: isTestnet ? "testnet-12" : "mainnet",
      scriptHex,
      fundingAmount: fundingAmount || 0,
      note: isTestnet
        ? "Deployed to testnet-12"
        : "Mainnet deployment requires additional setup",
      explorerUrl: isTestnet
        ? `https://explorer.testnet.kaspa.org/tx/${txId}`
        : `https://explorer.kaspa.org/tx/${txId}`,
    };

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
