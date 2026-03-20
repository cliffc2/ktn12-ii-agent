import { log } from "@/lib/agent/logger";
import { createSwapOrder, listSwapOrders, getSwapStats } from "@/lib/swap/executor";
import { createSwitch, listSwitches, heartbeat } from "@/lib/guardian/monitor";
import { fetchAllPrices } from "@/lib/arbitrage/scanner";
import { createUser } from "@/lib/gateway/auth";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; username?: string; first_name?: string };
  };
}

async function sendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const telegramId = String(msg.from?.id || "");

  try {
    if (text === "/start") {
      await sendMessage(chatId,
        `🟢 <b>KTN12 Agent Bot</b>\n\nWelcome! Available commands:\n\n` +
        `/swap &lt;amount&gt; &lt;direction&gt; — Initiate atomic swap\n` +
        `/price — Get live KAS prices\n` +
        `/balance — Check swap stats\n` +
        `/deadman setup &lt;timeout&gt; — Create dead man's switch\n` +
        `/heartbeat &lt;switchId&gt; — Send heartbeat\n` +
        `/switches — List your switches\n` +
        `/register — Get API key\n` +
        `/help — Show this message`
      );
      return;
    }

    if (text === "/help") {
      await sendMessage(chatId,
        `📖 <b>Commands</b>\n\n` +
        `<code>/swap 1 kas2eth</code> — Swap 1 KAS to ETH\n` +
        `<code>/swap 0.5 eth2kas</code> — Swap 0.5 ETH to KAS\n` +
        `<code>/price</code> — Live KAS prices\n` +
        `<code>/balance</code> — Your swap history\n` +
        `<code>/deadman setup 3600</code> — 1h dead man's switch\n` +
        `<code>/heartbeat cXXX</code> — Send heartbeat\n` +
        `<code>/register</code> — Get an API key\n`
      );
      return;
    }

    if (text === "/price") {
      const prices = await fetchAllPrices();
      if (prices.length === 0) {
        await sendMessage(chatId, "📊 No prices available right now. Try again shortly.");
        return;
      }
      const lines = prices.map((p) => `  <b>${p.exchange}</b>: $${p.price.toFixed(6)}`);
      await sendMessage(chatId, `💰 <b>KAS Prices</b>\n\n${lines.join("\n")}`);
      return;
    }

    if (text === "/balance") {
      const stats = await getSwapStats();
      await sendMessage(chatId,
        `📊 <b>Swap Stats</b>\n\n` +
        `Total: ${stats.total}\n` +
        `Active: ${stats.active}\n` +
        `Claimed: ${stats.claimed}\n` +
        `Volume: ${stats.totalVolume.toFixed(2)} KAS\n` +
        `Fees: ${stats.totalFees.toFixed(4)} KAS`
      );
      return;
    }

    if (text.startsWith("/swap ")) {
      const parts = text.split(" ");
      const amount = Number.parseFloat(parts[1]);
      const direction = parts[2] || "kas2eth";

      if (Number.isNaN(amount) || amount <= 0) {
        await sendMessage(chatId, "❌ Invalid amount. Usage: /swap 1.5 kas2eth");
        return;
      }

      const swap = await createSwapOrder({ direction, amount, userId: undefined });
      await sendMessage(chatId,
        `✅ <b>Swap Initiated</b>\n\n` +
        `ID: <code>${swap.id}</code>\n` +
        `Direction: ${direction}\n` +
        `Amount: ${amount}\n` +
        `Fee: ${swap.fee.toFixed(6)}\n` +
        `HTLC: <code>${swap.htlcAddress}</code>\n\n` +
        `🔑 Preimage: <code>${swap.preimage}</code>\n` +
        `⚠️ Keep this preimage safe!`
      );
      return;
    }

    if (text.startsWith("/deadman setup")) {
      const parts = text.split(" ");
      const timeout = Number.parseInt(parts[2]) || 3600;

      const sw = await createSwitch({
        owner: `telegram:${telegramId}`,
        beneficiary: "pending",
        timeout,
        label: `Telegram switch for ${msg.from?.username || telegramId}`,
      });

      await sendMessage(chatId,
        `🛡️ <b>Dead Man's Switch Created</b>\n\n` +
        `ID: <code>${sw.id}</code>\n` +
        `Timeout: ${timeout}s\n` +
        `Status: active\n\n` +
        `Use /heartbeat ${sw.id} to reset the timer.`
      );
      return;
    }

    if (text.startsWith("/heartbeat ")) {
      const switchId = text.split(" ")[1];
      try {
        await heartbeat(switchId);
        await sendMessage(chatId, `💓 Heartbeat sent for switch <code>${switchId}</code>`);
      } catch {
        await sendMessage(chatId, `❌ Switch not found: ${switchId}`);
      }
      return;
    }

    if (text === "/switches") {
      const switches = await listSwitches();
      if (switches.length === 0) {
        await sendMessage(chatId, "🛡️ No switches configured. Use /deadman setup <timeout>");
        return;
      }
      const lines = switches.map((s) =>
        `  ${s.status === "active" ? "🟢" : s.status === "warning" ? "🟡" : "🔴"} ${s.id.slice(0, 8)}... — ${s.remaining}s remaining`
      );
      await sendMessage(chatId, `🛡️ <b>Your Switches</b>\n\n${lines.join("\n")}`);
      return;
    }

    if (text === "/register") {
      const result = await createUser({ telegramId, tier: "free" });
      await sendMessage(chatId,
        `🔑 <b>API Key Generated</b>\n\n` +
        `Key: <code>${result.apiKey}</code>\n` +
        `Tier: Free (100 req/day)\n\n` +
        `Use this key with: x-api-key header`
      );
      return;
    }

    await sendMessage(chatId, "❓ Unknown command. Type /help to see available commands.");
  } catch (err) {
    await log("error", "bot", `Telegram error: ${(err as Error).message}`);
    await sendMessage(chatId, "❌ An error occurred. Please try again.");
  }
}

export async function setupWebhook(baseUrl: string) {
  if (!BOT_TOKEN) {
    await log("warn", "bot", "TELEGRAM_BOT_TOKEN not set — bot disabled");
    return { success: false, reason: "no token" };
  }

  const webhookUrl = `${baseUrl}/api/bot/telegram`;
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const data = await res.json();
  await log("info", "bot", `Webhook setup: ${data.ok ? "success" : "failed"}`, data);
  return data;
}