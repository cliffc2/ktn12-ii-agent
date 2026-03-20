import { NextResponse } from "next/server";
import { handleTelegramUpdate, setupWebhook } from "@/lib/bot/telegram";

export async function POST(req: Request) {
  try {
    const update = await req.json();
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "setup") {
    const baseUrl = url.searchParams.get("url") || `${url.protocol}//${url.host}`;
    const result = await setupWebhook(baseUrl);
    return NextResponse.json(result);
  }

  return NextResponse.json({
    status: "Telegram bot endpoint",
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
    setup: "GET /api/bot/telegram?action=setup&url=https://yourdomain.com",
  });
}