import { NextRequest, NextResponse } from "next/server";
import { createSwitch, heartbeat, getSwitchStatus, listSwitches, deleteSwitch } from "@/lib/guardian/monitor";

export async function GET(req: NextRequest) {
  const switchId = req.nextUrl.searchParams.get("id");
  const userId = req.nextUrl.searchParams.get("userId") || undefined;

  if (switchId) {
    try {
      const status = await getSwitchStatus(switchId);
      return NextResponse.json(status);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 404 });
    }
  }

  const switches = await listSwitches({ userId });
  return NextResponse.json({ switches });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "heartbeat") {
    if (!body.switchId) return NextResponse.json({ error: "switchId required" }, { status: 400 });
    try {
      const result = await heartbeat(body.switchId);
      return NextResponse.json({ success: true, switch: result });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 404 });
    }
  }

  if (action === "delete") {
    if (!body.switchId) return NextResponse.json({ error: "switchId required" }, { status: 400 });
    await deleteSwitch(body.switchId);
    return NextResponse.json({ success: true });
  }

  if (!body.owner || !body.beneficiary) {
    return NextResponse.json({ error: "owner and beneficiary required" }, { status: 400 });
  }

  const entry = await createSwitch({
    owner: body.owner,
    beneficiary: body.beneficiary,
    amount: body.amount,
    timeout: body.timeout,
    gracePeriod: body.gracePeriod,
    label: body.label,
    userId: body.userId,
    tier: body.tier,
    notifyEmail: body.notifyEmail,
    notifyWebhook: body.notifyWebhook,
  });

  return NextResponse.json({ success: true, switch: entry });
}