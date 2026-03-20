import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { intent } = body;

    if (!intent) {
      return NextResponse.json({ error: "intent required" }, { status: 400 });
    }

    const text = intent.toLowerCase();
    let action: string | null = null;
    const details: Record<string, unknown> = {};

    const amountMatch = text.match(/(\d+\.?\d*)\s*(kas|eth)/i);
    if (amountMatch) {
      details.amount = Number.parseFloat(amountMatch[1]);
      details.fromToken = amountMatch[2].toLowerCase();
    }

    const rateMatch = text.match(/at\s+(\d+\.?\d*)/);
    if (rateMatch) {
      details.rate = Number.parseFloat(rateMatch[1]);
    }

    if (text.includes("claim")) {
      action = "claim";
    } else if (text.includes("refund")) {
      action = "refund";
    } else if (text.includes("status") || text.includes("list")) {
      action = "list";
    } else if (text.includes("swap") || text.includes("exchange") || text.includes("trade")) {
      action = "swap";
      const toMatch = text.match(/\s(?:to|for)\s+(\w+)/i);
      if (toMatch?.[1]) {
        const toToken = toMatch[1].toLowerCase();
        details.direction = toToken.startsWith("eth") ? "kas2eth" : "eth2kas";
      } else if (details.fromToken) {
        details.direction = details.fromToken === "kas" ? "kas2eth" : "eth2kas";
      } else {
        details.direction = "kas2eth";
      }
    }

    return NextResponse.json({
      action,
      details,
      message: `Intent parsed: ${action || "unknown"}`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}