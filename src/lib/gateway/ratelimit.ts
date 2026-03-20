import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, trackUsage } from "./auth";

const ipCounts = new Map<string, { count: number; resetAt: number }>();
const FREE_RATE_LIMIT = 100;
const WINDOW_MS = 60_000;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function withRateLimit(
  req: NextRequest,
  handler: (userId?: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const start = Date.now();
  const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("api_key");

  if (apiKey) {
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid or exhausted API key", remaining: validation.remaining },
        { status: 403 }
      );
    }

    const response = await handler(validation.userId);
    const elapsed = Date.now() - start;

    trackUsage(apiKey, req.nextUrl.pathname, req.method, response.status, elapsed);
    response.headers.set("X-RateLimit-Remaining", String(validation.remaining! - 1));
    response.headers.set("X-RateLimit-Tier", validation.tier || "free");
    return response;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const entry = ipCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
    if (entry.count > FREE_RATE_LIMIT) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Get an API key at /admin for higher limits." },
        { status: 429 }
      );
    }
  }

  return handler();
}