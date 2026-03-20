import { NextResponse } from "next/server";
import { updateDeadmanConfig } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contractAddress, beneficiary, timeoutPeriod, gracePeriod, ownerKey } = body;

    const updates: Record<string, unknown> = {};
    if (contractAddress !== undefined) updates.contractAddress = contractAddress;
    if (beneficiary !== undefined) updates.beneficiary = beneficiary;
    if (timeoutPeriod !== undefined) updates.timeoutPeriod = Number(timeoutPeriod);
    if (gracePeriod !== undefined) updates.gracePeriod = Number(gracePeriod);
    if (ownerKey !== undefined) updates.ownerKey = ownerKey;

    updateDeadmanConfig(updates);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}