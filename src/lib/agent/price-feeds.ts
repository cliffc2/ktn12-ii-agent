import crypto from "crypto";
import type { PriceFeed } from "./types";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** Last known real KAS/USD price (fallback when APIs fail) */
let lastRealPrice: number | null = null;

/** Last known KAS/ETH price */
let lastKasEthPrice: number | null = null;

/** Quick-lookup cache: pair -> mid price */
const lastKnownPrices: Map<string, number> = new Map();

/** Persistent simulated exchange state (price + volume random walk) */
interface ExchangeState {
  name: string;
  /** Current mid-price offset ratio from real price (e.g. 0.002 = 0.2% above) */
  offset: number;
  /** Simulated 24h base volume in USD */
  baseVolume: number;
  /** Current volume noise factor */
  volumeFactor: number;
}

const exchangeStates: Map<string, ExchangeState> = new Map();

// ---------------------------------------------------------------------------
// Crypto-safe random helpers
// ---------------------------------------------------------------------------

/** Returns a uniformly distributed float in [0, 1) using crypto.randomBytes */
function secureRandom(): number {
  const bytes = crypto.randomBytes(4);
  return bytes.readUInt32BE(0) / 0x100000000;
}

/** Returns a normally-distributed random number (Box-Muller, mean 0 stddev 1) */
function gaussianRandom(): number {
  const u1 = secureRandom();
  const u2 = secureRandom();
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Exchange definitions
// ---------------------------------------------------------------------------

interface ExchangeProfile {
  name: string;
  /** Half-spread range [min, max] as fraction (e.g. 0.001 = 0.1%) */
  spreadRange: [number, number];
  /** Noise standard deviation as fraction of price */
  noiseSigma: number;
  /** Mean-reversion speed per tick (0-1, higher = faster revert) */
  meanReversion: number;
  /** Base 24h volume in USD */
  baseVolume: number;
  /** Probability of a "flash" large deviation per tick */
  flashProb: number;
  /** Max flash deviation as fraction */
  flashMaxDeviation: number;
}

const EXCHANGE_PROFILES: ExchangeProfile[] = [
  {
    name: "KaspaX",
    spreadRange: [0.001, 0.002],
    noiseSigma: 0.0008,
    meanReversion: 0.3,
    baseVolume: 2_800_000,
    flashProb: 0.0,
    flashMaxDeviation: 0.0,
  },
  {
    name: "KoinSwap",
    spreadRange: [0.002, 0.004],
    noiseSigma: 0.0018,
    meanReversion: 0.2,
    baseVolume: 1_500_000,
    flashProb: 0.02,
    flashMaxDeviation: 0.004,
  },
  {
    name: "IGRA-DEX",
    spreadRange: [0.003, 0.006],
    noiseSigma: 0.003,
    meanReversion: 0.15,
    baseVolume: 600_000,
    flashProb: 0.04,
    flashMaxDeviation: 0.006,
  },
  {
    name: "ZealousSwap",
    spreadRange: [0.001, 0.005],
    noiseSigma: 0.002,
    meanReversion: 0.25,
    baseVolume: 900_000,
    flashProb: 0.10,
    flashMaxDeviation: 0.012,
  },
];

// ---------------------------------------------------------------------------
// Real price fetchers
// ---------------------------------------------------------------------------

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd,eth";
const KASPA_PRICE_URL = "https://api.kaspa.org/info/price";

interface CoinGeckoResponse {
  kaspa?: {
    usd?: number;
    eth?: number;
  };
}

/**
 * Fetch KAS/USD (and KAS/ETH) from CoinGecko.
 * Returns null on failure.
 */
async function fetchCoinGeckoPrice(): Promise<{
  usd: number;
  eth: number | null;
} | null> {
  try {
    const resp = await fetch(COINGECKO_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as CoinGeckoResponse;
    const usd = data?.kaspa?.usd;
    if (typeof usd !== "number" || usd <= 0) return null;
    const eth = typeof data?.kaspa?.eth === "number" ? data.kaspa.eth : null;
    return { usd, eth };
  } catch {
    return null;
  }
}

/**
 * Fetch KAS/USD from the Kaspa REST API (alternate source).
 * Returns the price or null on failure.
 */
async function fetchKaspaOrgPrice(): Promise<number | null> {
  try {
    const resp = await fetch(KASPA_PRICE_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { price?: number };
    const price = data?.price;
    if (typeof price !== "number" || price <= 0) return null;
    return price;
  } catch {
    return null;
  }
}

/**
 * Resolve the best available real KAS/USD price from multiple sources.
 * Updates module-level caches as a side-effect.
 */
async function resolveRealPrice(): Promise<number | null> {
  // Fire both requests concurrently
  const [cgResult, kaspaResult] = await Promise.all([
    fetchCoinGeckoPrice(),
    fetchKaspaOrgPrice(),
  ]);

  // Prefer CoinGecko as primary
  if (cgResult) {
    lastRealPrice = cgResult.usd;
    if (cgResult.eth !== null) lastKasEthPrice = cgResult.eth;
  } else if (kaspaResult) {
    lastRealPrice = kaspaResult;
  }
  // If both fail, lastRealPrice retains its previous value (may be null on first ever call)

  return lastRealPrice;
}

// ---------------------------------------------------------------------------
// Simulated exchange price generation
// ---------------------------------------------------------------------------

function getOrInitState(profile: ExchangeProfile): ExchangeState {
  let state = exchangeStates.get(profile.name);
  if (!state) {
    // Seed with a small random offset so exchanges don't all start identical
    state = {
      name: profile.name,
      offset: gaussianRandom() * profile.noiseSigma * 2,
      baseVolume: profile.baseVolume,
      volumeFactor: 0.9 + secureRandom() * 0.2,
    };
    exchangeStates.set(profile.name, state);
  }
  return state;
}

/**
 * Advance the simulated exchange state by one tick and produce a PriceFeed.
 */
function tickExchange(
  profile: ExchangeProfile,
  realPrice: number,
): PriceFeed {
  const state = getOrInitState(profile);

  // --- Random walk with mean reversion ---
  const noise = gaussianRandom() * profile.noiseSigma;
  // Mean-revert toward 0 offset (i.e. toward real price)
  state.offset =
    state.offset * (1 - profile.meanReversion) + noise;

  // --- Flash opportunity (large sudden deviation) ---
  if (profile.flashProb > 0 && secureRandom() < profile.flashProb) {
    const flashDir = secureRandom() < 0.5 ? 1 : -1;
    const flashMag =
      profile.flashMaxDeviation * (0.5 + 0.5 * secureRandom());
    state.offset += flashDir * flashMag;
  }

  // Clamp offset so prices don't go unrealistically far
  state.offset = clamp(state.offset, -0.02, 0.02);

  // --- Compute bid / ask ---
  const mid = realPrice * (1 + state.offset);
  const halfSpread =
    profile.spreadRange[0] +
    secureRandom() * (profile.spreadRange[1] - profile.spreadRange[0]);

  const bid = mid * (1 - halfSpread);
  const ask = mid * (1 + halfSpread);
  const spread = ask - bid;
  const spreadBps = (spread / mid) * 10_000;

  // --- Volume random walk ---
  state.volumeFactor += (gaussianRandom() * 0.05);
  state.volumeFactor = clamp(state.volumeFactor, 0.3, 2.5);
  const volume24h = Math.round(state.baseVolume * state.volumeFactor);

  const feed: PriceFeed = {
    source: profile.name,
    pair: "KAS/USD",
    bid: roundPrice(bid),
    ask: roundPrice(ask),
    spread: roundPrice(spread),
    spreadBps: Math.round(spreadBps * 100) / 100,
    volume24h,
    timestamp: Date.now(),
  };

  // Cache the mid price for quick lookup
  lastKnownPrices.set(`${profile.name}:KAS/USD`, roundPrice(mid));

  return feed;
}

/** Round a price to 6 decimal places (appropriate for sub-cent assets) */
function roundPrice(p: number): number {
  return Math.round(p * 1_000_000) / 1_000_000;
}

// ---------------------------------------------------------------------------
// Build real-source PriceFeed objects
// ---------------------------------------------------------------------------

function buildRealFeed(
  source: string,
  pair: string,
  price: number,
  spreadBps: number,
  volume24h: number,
): PriceFeed {
  const halfSpread = (spreadBps / 10_000 / 2) * price;
  const bid = roundPrice(price - halfSpread);
  const ask = roundPrice(price + halfSpread);
  const spread = roundPrice(ask - bid);

  lastKnownPrices.set(`${source}:${pair}`, roundPrice(price));

  return {
    source,
    pair,
    bid,
    ask,
    spread,
    spreadBps,
    volume24h,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch price feeds from all sources (real APIs + simulated exchanges).
 *
 * Real sources:
 *  - CoinGecko  (KAS/USD, KAS/ETH)
 *  - Kaspa.org  (KAS/USD)
 *
 * Simulated:
 *  - KaspaX, KoinSwap, IGRA-DEX, ZealousSwap (KAS/USD)
 *
 * On complete API failure the simulated exchanges will still produce feeds
 * based on the last known real price. If no price has ever been fetched,
 * returns an empty array.
 */
export async function fetchAllPriceFeeds(): Promise<PriceFeed[]> {
  const feeds: PriceFeed[] = [];

  // 1. Resolve real price (updates lastRealPrice / lastKasEthPrice)
  const realPrice = await resolveRealPrice();

  if (realPrice === null) {
    // No price available at all — cannot produce any feeds
    return feeds;
  }

  // 2. Build real-source feeds
  //    CoinGecko KAS/USD — tight spread, high volume (aggregator)
  feeds.push(
    buildRealFeed("CoinGecko", "KAS/USD", realPrice, 5, 12_000_000),
  );

  //    KAS/ETH if available
  if (lastKasEthPrice !== null) {
    feeds.push(
      buildRealFeed("CoinGecko", "KAS/ETH", lastKasEthPrice, 8, 3_200_000),
    );
  }

  //    Kaspa.org feed (use same price; it's the same underlying but we expose it as a separate source)
  feeds.push(
    buildRealFeed("Kaspa.org", "KAS/USD", realPrice, 0, 0),
  );

  // 3. Tick all simulated exchanges
  for (const profile of EXCHANGE_PROFILES) {
    feeds.push(tickExchange(profile, realPrice));
  }

  return feeds;
}

/**
 * Quick synchronous lookup of the last known mid-price for a given pair.
 *
 * @param pair - Formatted as `"Source:PAIR"` (e.g. `"KaspaX:KAS/USD"`)
 *               or just `"KAS/USD"` which returns the real CoinGecko price.
 * @returns The last known mid-price, or `null` if never fetched.
 */
export function getLastKnownPrice(pair: string): number | null {
  // If caller passes a bare pair like "KAS/USD", default to CoinGecko
  const key = pair.includes(":") ? pair : `CoinGecko:${pair}`;
  return lastKnownPrices.get(key) ?? null;
}

/**
 * Return the current real KAS/USD reference price (last successfully fetched).
 * Useful for profit calculations.
 */
export function getRealReferencePrice(): number | null {
  return lastRealPrice;
}

/**
 * Reset all simulated exchange state. Useful for testing.
 */
export function resetExchangeStates(): void {
  exchangeStates.clear();
  lastKnownPrices.clear();
  lastRealPrice = null;
  lastKasEthPrice = null;
}
