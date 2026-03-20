import { NextResponse } from "next/server";

const KASPA_API = "https://api-tn12.kaspa.org";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { method, params } = body;

    if (!method) {
      return NextResponse.json({ error: "method required" }, { status: 400 });
    }

    const methodMap: Record<string, string> = {
      get_info: "/info",
      get_block_dag_info: "/info",
      get_block_count: "/info",
      get_balance_by_address: "/addresses/{address}/balance",
      get_utxos_by_addresses: "/addresses/{address}/utxos",
      get_fee_estimate: "/info",
    };

    const apiPath = methodMap[method];
    if (!apiPath) {
      return NextResponse.json({
        method,
        note: "Method not available via REST proxy - use wRPC directly",
        rpcEndpoints: {
          borsh: "ws://localhost:17210",
          json: "ws://localhost:18210",
          grpc: "localhost:16210",
        },
      });
    }

    let url = `${KASPA_API}${apiPath}`;
    if (apiPath.includes("{address}") && params) {
      const address = Array.isArray(params) ? params[0] : params.address || params;
      url = url.replace("{address}", encodeURIComponent(String(address)));
    }

    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await resp.json();

    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}