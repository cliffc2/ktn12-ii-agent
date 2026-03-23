import crypto from "node:crypto";

export const ESCROW_NETWORK = "testnet-12";
export const ESCROW_API = process.env.ESCROW_API_URL || "http://localhost:3000";
export const DEFAULT_LOCK_TIME = 144;
export const DEFAULT_FEE_PERCENT = 1;

export type EscrowPattern = "standard" | "with-arbitrator" | "atomic-swap";
export type EscrowStatus =
  | "pending"
  | "funded"
  | "released"
  | "refunded"
  | "disputed"
  | "expired";

export interface CreateEscrowParams {
  pattern: EscrowPattern;
  amount: number;
  buyerPubkey: string;
  sellerPubkey: string;
  lockTime?: number;
  feePercent?: number;
  arbitratorPubkey?: string;
  hashlock?: string;
}

export interface Escrow {
  id: string;
  pattern: EscrowPattern;
  status: EscrowStatus;
  fundingAddress: string;
  escrowAmount: number;
  buyerPubkey: string;
  sellerPubkey: string;
  arbitratorPubkey?: string;
  hashlock?: string;
  timelock: number;
  feePercent: number;
  sellerAmount: number;
  feeAmount: number;
  redeemScript: string;
  createdAt: number;
  fundedAt?: number;
  releasedAt?: number;
  refundedAt?: number;
  fundingTxId?: string;
  releaseTxId?: string;
  refundTxId?: string;
}

interface EscrowStore {
  escrows: Map<string, Escrow>;
  counter: number;
}

const escrowStore: EscrowStore = {
  escrows: new Map(),
  counter: 0,
};

function generateKeypair(): { publicKey: string; privateKey: string } {
  const privateKey = crypto.randomBytes(32).toString("hex");
  const publicKey = crypto
    .createHash("sha256")
    .update(privateKey, "hex")
    .digest("hex");
  return { publicKey, privateKey };
}

function buildRedeemScript(
  buyerPubkey: string,
  sellerPubkey: string,
  hashlock: string,
  timelock: number,
  arbitratorPubkey?: string,
): string {
  const parts = [
    "OP_IF",
    "OP_HASH160",
    hashlock,
    "OP_EQUALVERIFY",
    arbitratorPubkey
      ? `OP_${arbitratorPubkey.slice(0, 8).toUpperCase()}`
      : "OPseller",
    "OP_ELSE",
    String(timelock),
    "OP_CHECKLOCKTIMEVERIFY",
    "OP_DROP",
    "OP_DUP",
    "OP_HASH160",
    sellerPubkey.slice(0, 40),
    "OP_EQUALVERIFY",
    "OP_CHECKSIG",
    "OP_ENDIF",
  ];
  return parts.join(" ");
}

function deriveFundingAddress(redeemScript: string): string {
  const hash = crypto.createHash("sha256").update(redeemScript).digest("hex");
  return `kaspatest:qzr${hash.slice(0, 58)}`;
}

export function createEscrow(params: CreateEscrowParams): Escrow {
  const id = `escrow-${++escrowStore.counter}-${Date.now()}`;
  const hashlock = params.hashlock || crypto.randomBytes(32).toString("hex");
  const timelock = params.lockTime || DEFAULT_LOCK_TIME;
  const feePercent = params.feePercent || DEFAULT_FEE_PERCENT;

  const sellerAmount = params.amount * (1 - feePercent / 100);
  const feeAmount = params.amount * (feePercent / 100);

  const redeemScript = buildRedeemScript(
    params.buyerPubkey,
    params.sellerPubkey,
    hashlock,
    timelock,
    params.arbitratorPubkey,
  );

  const escrow: Escrow = {
    id,
    pattern: params.pattern,
    status: "pending",
    fundingAddress: deriveFundingAddress(redeemScript),
    escrowAmount: params.amount,
    buyerPubkey: params.buyerPubkey,
    sellerPubkey: params.sellerPubkey,
    arbitratorPubkey: params.arbitratorPubkey,
    hashlock,
    timelock,
    feePercent,
    sellerAmount,
    feeAmount,
    redeemScript,
    createdAt: Date.now(),
  };

  escrowStore.escrows.set(id, escrow);
  return escrow;
}

export function getEscrow(id: string): Escrow | undefined {
  return escrowStore.escrows.get(id);
}

export function listEscrows(): Escrow[] {
  return Array.from(escrowStore.escrows.values()).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

export function fundEscrow(
  id: string,
  fundingTxId: string,
): Escrow | undefined {
  const escrow = escrowStore.escrows.get(id);
  if (!escrow || escrow.status !== "pending") return undefined;

  escrow.status = "funded";
  escrow.fundedAt = Date.now();
  escrow.fundingTxId = fundingTxId;
  escrowStore.escrows.set(id, escrow);
  return escrow;
}

export function releaseEscrow(
  id: string,
  preimage: string,
  releaseTxId: string,
): Escrow | undefined {
  const escrow = escrowStore.escrows.get(id);
  if (!escrow || escrow.status !== "funded") return undefined;

  const hashCheck = crypto
    .createHash("sha256")
    .update(preimage, "hex")
    .digest("hex");
  if (hashCheck !== escrow.hashlock) return undefined;

  escrow.status = "released";
  escrow.releasedAt = Date.now();
  escrow.releaseTxId = releaseTxId;
  escrowStore.escrows.set(id, escrow);
  return escrow;
}

export function refundEscrow(
  id: string,
  refundTxId: string,
): Escrow | undefined {
  const escrow = escrowStore.escrows.get(id);
  if (!escrow || escrow.status !== "funded") return undefined;

  escrow.status = "refunded";
  escrow.refundedAt = Date.now();
  escrow.refundTxId = refundTxId;
  escrowStore.escrows.set(id, escrow);
  return escrow;
}

export function disputeEscrow(
  id: string,
  winner: "buyer" | "seller",
  disputeTxId: string,
): Escrow | undefined {
  const escrow = escrowStore.escrows.get(id);
  if (!escrow || escrow.status !== "funded") return undefined;

  escrow.status = "disputed";
  escrowStore.escrows.set(id, escrow);
  return escrow;
}

export async function broadcastTransaction(
  signedTx: string,
): Promise<{ txId: string; error?: string }> {
  try {
    const resp = await fetch("https://api-tn12.kaspa.org/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawTx: signedTx }),
    });
    const data = await resp.json();
    if (data.txId) {
      return { txId: data.txId };
    }
    return { txId: "", error: data.error || "Unknown error" };
  } catch (e) {
    return { txId: "", error: (e as Error).message };
  }
}

export async function getUtxos(
  address: string,
): Promise<{ txId: string; vout: number; amount: number; script: string }[]> {
  try {
    const resp = await fetch(
      `https://api-tn12.kaspa.org/addresses/${address}/utxos`,
    );
    const data = await resp.json();
    return (data || []).map(
      (utxo: {
        outpoint: { transactionId: string; index: number };
        output: { value: number; scriptPublicKey: { script: string } };
      }) => ({
        txId: utxo.outpoint.transactionId,
        vout: utxo.outpoint.index,
        amount: utxo.output.value,
        script: utxo.output.scriptPublicKey.script,
      }),
    );
  } catch {
    return [];
  }
}

export async function getCurrentDaa(): Promise<number> {
  try {
    const resp = await fetch("https://api-tn12.kaspa.org/info");
    const data = await resp.json();
    return data.virtualDaaScore || data.virtualSelectedParentBlueScore || 0;
  } catch {
    return 0;
  }
}

export function isExpired(escrow: Escrow): boolean {
  if (escrow.status !== "funded" || !escrow.fundedAt || escrow.timelock <= 0) {
    return false;
  }
  return Date.now() > escrow.fundedAt + escrow.timelock * 1000 * 60;
}

export { generateKeypair };
