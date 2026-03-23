import {
  createEscrow,
  disputeEscrow,
  fundEscrow as fundEscrowFn,
  generateKeypair,
  getCurrentDaa,
  getEscrow,
  isExpired,
  listEscrows,
  refundEscrow as refundEscrowFn,
  releaseEscrow as releaseEscrowFn,
} from "@/lib/escrow";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "create": {
        if (!params.amount || !params.buyerPubkey || !params.sellerPubkey) {
          return NextResponse.json(
            { error: "amount, buyerPubkey, sellerPubkey required" },
            { status: 400 },
          );
        }
        const escrow = createEscrow({
          pattern: params.pattern || "standard",
          amount: params.amount,
          buyerPubkey: params.buyerPubkey,
          sellerPubkey: params.sellerPubkey,
          lockTime: params.lockTime,
          feePercent: params.feePercent,
          arbitratorPubkey: params.arbitratorPubkey,
          hashlock: params.hashlock,
        });
        return NextResponse.json({
          success: true,
          escrow: {
            id: escrow.id,
            fundingAddress: escrow.fundingAddress,
            escrowAmount: escrow.escrowAmount,
            sellerAmount: escrow.sellerAmount,
            feeAmount: escrow.feeAmount,
            hashlock: escrow.hashlock,
            timelock: escrow.timelock,
            redeemScript: escrow.redeemScript,
            status: escrow.status,
          },
          message: `Created escrow. Send ${escrow.escrowAmount} KAS to ${escrow.fundingAddress}`,
        });
      }

      case "fund": {
        if (!params.id || !params.fundingTxId) {
          return NextResponse.json(
            { error: "id and fundingTxId required" },
            { status: 400 },
          );
        }
        const escrow = fundEscrowFn(params.id, params.fundingTxId);
        if (!escrow) {
          return NextResponse.json(
            { error: "Escrow not found or already funded" },
            { status: 404 },
          );
        }
        return NextResponse.json({
          success: true,
          status: escrow.status,
          message: "Escrow funded successfully",
        });
      }

      case "release": {
        if (!params.id || !params.preimage) {
          return NextResponse.json(
            { error: "id and preimage required" },
            { status: 400 },
          );
        }
        const escrow = releaseEscrowFn(
          params.id,
          params.preimage,
          params.releaseTxId || "",
        );
        if (!escrow) {
          return NextResponse.json(
            { error: "Escrow not found, not funded, or invalid preimage" },
            { status: 400 },
          );
        }
        return NextResponse.json({
          success: true,
          status: escrow.status,
          message: `Released ${escrow.sellerAmount} KAS to seller`,
        });
      }

      case "refund": {
        if (!params.id) {
          return NextResponse.json({ error: "id required" }, { status: 400 });
        }
        const escrow = getEscrow(params.id);
        if (!escrow) {
          return NextResponse.json(
            { error: "Escrow not found" },
            { status: 404 },
          );
        }
        if (escrow.status !== "funded") {
          return NextResponse.json(
            { error: "Escrow not funded yet" },
            { status: 400 },
          );
        }
        if (!isExpired(escrow)) {
          const currentDaa = await getCurrentDaa();
          const remaining =
            escrow.timelock - (currentDaa - (escrow.fundedAt || 0) / 1000 / 60);
          return NextResponse.json(
            {
              error: `Timelock not expired. ${Math.ceil(remaining)} blocks remaining`,
            },
            { status: 400 },
          );
        }
        const refunded = refundEscrowFn(params.id, params.refundTxId || "");
        return NextResponse.json({
          success: true,
          status: refunded?.status,
          message: "Refunded to buyer",
        });
      }

      case "dispute": {
        if (!params.id || !params.winner) {
          return NextResponse.json(
            { error: "id and winner (buyer/seller) required" },
            { status: 400 },
          );
        }
        const escrow = disputeEscrow(
          params.id,
          params.winner,
          params.disputeTxId || "",
        );
        if (!escrow) {
          return NextResponse.json(
            { error: "Escrow not found or not funded" },
            { status: 404 },
          );
        }
        return NextResponse.json({
          success: true,
          status: escrow.status,
          winner: params.winner,
          message: `Dispute resolved. Funds go to ${params.winner}`,
        });
      }

      case "keypair": {
        const keypair = generateKeypair();
        return NextResponse.json({
          publicKey: keypair.publicKey,
          privateKey: keypair.privateKey,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const escrow = getEscrow(id);
    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }
    return NextResponse.json({ escrow });
  }

  return NextResponse.json({ escrows: listEscrows() });
}
