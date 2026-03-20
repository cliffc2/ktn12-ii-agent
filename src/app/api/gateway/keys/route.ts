import { NextRequest, NextResponse } from "next/server";
import { createUser, listApiKeys, revokeApiKey, API_TIERS } from "@/lib/gateway/auth";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || undefined;
  const keys = await listApiKeys(userId);
  return NextResponse.json({ keys, tiers: API_TIERS });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { email, telegramId, tier, action, keyId } = body;

  if (action === "revoke" && keyId) {
    await revokeApiKey(keyId);
    return NextResponse.json({ success: true, message: "Key revoked" });
  }

  const result = await createUser({ email, telegramId, tier });
  return NextResponse.json({
    success: true,
    userId: result.user.id,
    apiKey: result.apiKey,
    tier: result.user.tier,
  });
}