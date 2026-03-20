export interface FeeTier {
  name: string;
  minAmount: number;
  rate: number;
  description: string;
}

export const FEE_TIERS: FeeTier[] = [
  { name: "instant", minAmount: 0, rate: 0.01, description: "1% — Instant execution, any amount" },
  { name: "standard", minAmount: 0, rate: 0.005, description: "0.5% — Standard swaps under 10 KAS" },
  { name: "bulk", minAmount: 10, rate: 0.003, description: "0.3% — Bulk swaps 10+ KAS" },
  { name: "whale", minAmount: 100, rate: 0.001, description: "0.1% — Whale tier 100+ KAS" },
];

export function calculateFee(amount: number, tier?: string): { fee: number; rate: number; tierName: string } {
  if (tier === "instant") {
    const t = FEE_TIERS[0];
    return { fee: amount * t.rate, rate: t.rate, tierName: t.name };
  }

  let selected = FEE_TIERS[1];
  for (const t of FEE_TIERS) {
    if (t.name !== "instant" && amount >= t.minAmount) {
      selected = t;
    }
  }

  return {
    fee: amount * selected.rate,
    rate: selected.rate,
    tierName: selected.name,
  };
}

export function getNetAmount(amount: number, tier?: string): { net: number; fee: number; rate: number } {
  const { fee, rate } = calculateFee(amount, tier);
  return { net: amount - fee, fee, rate };
}