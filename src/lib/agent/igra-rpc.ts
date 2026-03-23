export const IGRA_NETWORKS = {
  mainnet: {
    name: "Igra Mainnet",
    chainId: 38833,
    rpcUrl: "https://rpc.igralabs.com:8545",
    explorer: "https://explorer.igralabs.com",
    minGasPriceGwei: 1000,
    currency: "iKAS",
  },
  testnet: {
    name: "IGRA Galleon Testnet",
    chainId: 38836,
    rpcUrl: "https://galleon-testnet.igralabs.com:8545",
    explorer: "https://explorer.galleon-testnet.igralabs.com",
    minGasPriceGwei: 2000,
    currency: "iKAS",
  },
} as const;

export type IGRANetwork = keyof typeof IGRA_NETWORKS;

export const DEFAULT_NETWORK: IGRANetwork = "testnet";

export async function checkIgraConnection(
  network: IGRANetwork = "testnet",
): Promise<boolean> {
  const config = IGRA_NETWORKS[network];
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getIgraBlockNumber(
  network: IGRANetwork = "testnet",
): Promise<number | null> {
  const config = IGRA_NETWORKS[network];
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });
    const data = await response.json();
    return Number.parseInt(data.result, 16);
  } catch {
    return null;
  }
}

export async function getIgraBalance(
  address: string,
  network: IGRANetwork = "testnet",
): Promise<string | null> {
  const config = IGRA_NETWORKS[network];
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const data = await response.json();
    return data.result;
  } catch {
    return null;
  }
}

export async function sendIgraTransaction(
  signedTx: string,
  network: IGRANetwork = "testnet",
): Promise<string | null> {
  const config = IGRA_NETWORKS[network];
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [signedTx],
        id: 1,
      }),
    });
    const data = await response.json();
    return data.result || null;
  } catch {
    return null;
  }
}

export async function getTransactionReceipt(
  txHash: string,
  network: IGRANetwork = "testnet",
): Promise<Record<string, unknown> | null> {
  const config = IGRA_NETWORKS[network];
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: 1,
      }),
    });
    const data = await response.json();
    return data.result;
  } catch {
    return null;
  }
}

export async function estimateGas(
  tx: { from: string; to: string; value?: string; data?: string },
  network: IGRANetwork = "testnet",
): Promise<number | null> {
  const config = IGRA_NETWORKS[network];
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_estimateGas",
        params: [tx],
        id: 1,
      }),
    });
    const data = await response.json();
    return Number.parseInt(data.result, 16);
  } catch {
    return null;
  }
}

export async function getGasPrice(
  network: IGRANetwork = "testnet",
): Promise<bigint | null> {
  const config = IGRA_NETWORKS[network];
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      }),
    });
    const data = await response.json();
    return BigInt(data.result);
  } catch {
    return null;
  }
}
