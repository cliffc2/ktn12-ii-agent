const KASPA_API = "https://api-tn12.kaspa.org";

export async function fetchKaspaAPI(path: string) {
  const resp = await fetch(`${KASPA_API}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 5 },
  });
  if (!resp.ok) {
    throw new Error(`Kaspa API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

export async function getBalance(address: string) {
  try {
    const data = await fetchKaspaAPI(`/addresses/${address}/balance`);
    return {
      balance: Number.parseInt(data.balance || "0") / 1e8,
      pending: Number.parseInt(data.pendingBalance || "0") / 1e8,
    };
  } catch (e: unknown) {
    return { balance: 0, pending: 0, error: (e as Error).message };
  }
}

export async function getUTXOs(address: string) {
  try {
    return await fetchKaspaAPI(`/addresses/${address}/utxos`);
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

export async function getNetworkInfo() {
  try {
    const data = await fetchKaspaAPI("/info");
    return {
      blockCount: data.blockCount || 0,
      headerCount: data.headerCount || 0,
      difficulty: data.difficulty || 0,
      networkName: data.networkName || "testnet-12",
      virtualDaaScore: data.virtualDaaScore || data.virtualSelectedParentBlueScore || 0,
      pastMedianTime: data.pastMedianTime || 0,
    };
  } catch (e: unknown) {
    return {
      blockCount: 0,
      headerCount: 0,
      difficulty: 0,
      networkName: "testnet-12",
      virtualDaaScore: 0,
      error: (e as Error).message,
    };
  }
}