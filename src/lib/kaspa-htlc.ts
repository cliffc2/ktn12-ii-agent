import crypto from "node:crypto";
import { broadcastTransaction, getCurrentDaa, getUtxos } from "./escrow";

const KASPA_API = "https://api-tn12.kaspa.org";

export interface KaspaUtxo {
  txId: string;
  vout: number;
  amount: number;
  script: string;
}

export interface TransactionInput {
  txId: string;
  vout: number;
  script: string;
  value: number;
}

export interface TransactionOutput {
  address: string;
  amount: number;
}

export interface SigningKey {
  privateKey: string;
  publicKey: string;
}

const DUST_THRESHOLD = 1000;
const DEFAULT_FEE_PER_KB = 1000;

export function createP2PKHLockScript(pubkeyHash: string): string {
  return `OP_DUP OP_HASH160 ${pubkeyHash} OP_EQUALVERIFY OP_CHECKSIG`;
}

export function createHTLCScript(
  hashlock: string,
  sellerPubkeyHash: string,
  timelock: number,
): string {
  const script = `
    OP_IF
      OP_HASH160 ${hashlock} OP_EQUALVERIFY ${sellerPubkeyHash}
    OP_ELSE
      ${timelock} OP_CHECKLOCKTIMEVERIFY OP_DROP
      OP_DUP OP_HASH160 ${sellerPubkeyHash} OP_EQUALVERIFY OP_CHECKSIG
    OP_ENDIF
  `
    .trim()
    .replace(/\s+/g, " ");
  return script;
}

export function pubkeyToPubkeyHash(pubkey: string): string {
  const hash = crypto.createHash("sha256").update(pubkey, "hex").digest("hex");
  return crypto.createHash("ripemd160").update(hash, "hex").digest("hex");
}

export function buildFundingTransaction(
  inputs: TransactionInput[],
  escrowAddress: string,
  amount: number,
  changeAddress: string,
  fee: number,
): { tx: string; txId: string } {
  const txVersion = 1;
  const txIns = inputs.map((input) => ({
    previousOutput: input.txId,
    signatureScript: input.script,
    sequence: 0xffffffff,
  }));
  const txOuts = [
    { address: escrowAddress, amount },
    {
      address: changeAddress,
      amount: getTotalInputAmount(inputs) - amount - fee,
    },
  ];

  const txId = crypto
    .createHash("sha256")
    .update(JSON.stringify({ txVersion, txIns, txOuts }))
    .digest("hex");
  const tx = serializeTransaction(txVersion, txIns, txOuts);

  return { tx, txId };
}

export function buildReleaseTransaction(
  input: TransactionInput,
  escrowScript: string,
  preimage: string,
  sellerAddress: string,
  fee: number,
): { tx: string; txId: string } {
  const txVersion = 1;
  const txIns = [
    {
      previousOutput: input.txId,
      signatureScript: `${preimage} ${escrowScript}`,
      sequence: 0xffffffff,
    },
  ];
  const txOuts = [
    {
      address: sellerAddress,
      amount: input.value - fee,
    },
  ];

  const txId = crypto
    .createHash("sha256")
    .update(JSON.stringify({ txVersion, txIns, txOuts }))
    .digest("hex");
  const tx = serializeTransaction(txVersion, txIns, txOuts);

  return { tx, txId };
}

export function buildRefundTransaction(
  input: TransactionInput,
  escrowScript: string,
  buyerAddress: string,
  timelock: number,
  fee: number,
): { tx: string; txId: string } {
  const txVersion = 1;
  const txIns = [
    {
      previousOutput: input.txId,
      signatureScript: `00 ${escrowScript}`,
      sequence: timelock,
    },
  ];
  const txOuts = [
    {
      address: buyerAddress,
      amount: input.value - fee,
    },
  ];

  const txId = crypto
    .createHash("sha256")
    .update(JSON.stringify({ txVersion, txIns, txOuts }))
    .digest("hex");
  const tx = serializeTransaction(txVersion, txIns, txOuts);

  return { tx, txId };
}

function getTotalInputAmount(inputs: TransactionInput[]): number {
  return inputs.reduce((sum, input) => sum + input.value, 0);
}

function serializeTransaction(
  version: number,
  inputs: {
    previousOutput: string;
    signatureScript: string;
    sequence: number;
  }[],
  outputs: { address: string; amount: number }[],
): string {
  let hex = version.toString(16).padStart(8, "0");
  hex += varIntToHex(inputs.length);

  for (const input of inputs) {
    hex += reverseHex(input.previousOutput);
    hex += "00"; // vout placeholder
    hex += varIntToHex(Buffer.from(input.signatureScript).length);
    hex += Buffer.from(input.signatureScript).toString("hex");
    hex += input.sequence.toString(16).padStart(8, "0");
  }

  hex += varIntToHex(outputs.length);
  for (const output of outputs) {
    hex += output.amount.toString(16).padStart(16, "0");
    hex += varIntToHex(25);
    const addrBytes = base58Decode(output.address);
    hex += addrBytes.toString("hex");
  }

  return hex;
}

function varIntToHex(n: number): string {
  if (n < 0xfd) return n.toString(16).padStart(2, "0");
  if (n < 0xffff) return `fd${n.toString(16).padStart(4, "0")}`;
  if (n < 0xffffffff) return `fe${n.toString(16).padStart(8, "0")}`;
  return `ff${n.toString(16).padStart(16, "0")}`;
}

function reverseHex(hex: string): string {
  return hex.match(/.{2}/g)?.reverse().join("") || "";
}

function base58Decode(address: string): Buffer {
  const base58Chars =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const char of address) {
    num = num * BigInt(58) + BigInt(base58Chars.indexOf(char));
  }
  const hex = num.toString(16);
  return Buffer.from(hex.padStart(44, "0"), "hex");
}

export async function estimateFee(
  inputCount: number,
  outputCount: number,
): Promise<number> {
  const size = inputCount * 150 + outputCount * 40 + 10;
  return Math.ceil(size / 1000) * DEFAULT_FEE_PER_KB;
}

export async function buildAndBroadcast(
  inputs: TransactionInput[],
  outputs: TransactionOutput[],
  privateKey: string,
): Promise<{ txId: string; error?: string }> {
  const totalIn = getTotalInputAmount(inputs);
  const totalOut = outputs.reduce((sum, o) => sum + o.amount, 0);
  const fee = await estimateFee(inputs.length, outputs.length);

  if (totalIn < totalOut + fee) {
    return { txId: "", error: "Insufficient funds" };
  }

  const changeAddress =
    "kaspatest:qz4s3lrv9g0y6q4e5x7u8z9a0b1c2d3e4f5g6h7j8k9l0m1n2o3p4q5r6s7t8";

  const { tx } = buildFundingTransaction(
    inputs,
    outputs[0].address,
    outputs[0].amount,
    changeAddress,
    fee,
  );

  return broadcastTransaction(tx);
}

export async function getEscrowUtxos(
  escrowAddress: string,
): Promise<KaspaUtxo[]> {
  return getUtxos(escrowAddress);
}

export async function waitForFunding(
  escrowAddress: string,
  expectedAmount: number,
  maxAttempts = 10,
): Promise<KaspaUtxo | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const utxos = await getEscrowUtxos(escrowAddress);
    const funded = utxos.find((u) => u.amount >= expectedAmount);
    if (funded) return funded;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

export async function getBlockHeight(): Promise<number> {
  return getCurrentDaa();
}

export async function getConfirmations(txId: string): Promise<number> {
  try {
    const resp = await fetch(`${KASPA_API}/transactions/${txId}`);
    const data = await resp.json();
    const currentDaa = await getCurrentDaa();
    if (data.confirmations) return data.confirmations;
    if (data.virtualSelectedParentBlueScore) {
      return currentDaa - data.virtualSelectedParentBlueScore;
    }
    return 0;
  } catch {
    return 0;
  }
}
