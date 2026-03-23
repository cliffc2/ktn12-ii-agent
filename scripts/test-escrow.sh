#!/bin/bash
# Escrow Test Script - Testnet-12
# This script demonstrates the escrow flow

echo "=== KTN12 Agent Escrow Test (Testnet-12) ==="
echo

# Generate keypairs for buyer and seller
echo "1. Generating keypairs..."
BUYER_KEYS=$(curl -s -X POST http://localhost:3000/api/escrow -H "Content-Type: application/json" -d '{"action":"keypair"}')
SELLER_KEYS=$(curl -s -X POST http://localhost:3000/api/escrow -H "Content-Type: application/json" -d '{"action":"keypair"}')

BUYER_PUB=$(echo $BUYER_KEYS | jq -r '.publicKey')
SELLER_PUB=$(echo $SELLER_KEYS | jq -r '.publicKey')

echo "   Buyer Pubkey: $BUYER_PUB"
echo "   Seller Pubkey: $SELLER_PUB"
echo

# Create escrow
echo "2. Creating escrow..."
CREATE_RESULT=$(curl -s -X POST http://localhost:3000/api/escrow -H "Content-Type: application/json" -d "{
  \"action\": \"create\",
  \"amount\": 100000000,
  \"buyerPubkey\": \"$BUYER_PUB\",
  \"sellerPubkey\": \"$SELLER_PUB\",
  \"lockTime\": 144,
  \"feePercent\": 1
}")

echo "$CREATE_RESULT" | jq .
ESCROW_ID=$(echo "$CREATE_RESULT" | jq -r '.escrow.id')
FUNDING_ADDR=$(echo "$CREATE_RESULT" | jq -r '.escrow.fundingAddress')
HASHLOCK=$(echo "$CREATE_RESULT" | jq -r '.escrow.hashlock')

echo "   Escrow ID: $ESCROW_ID"
echo "   Funding Address: $FUNDING_ADDR"
echo "   Hashlock: $HASHLOCK"
echo

# In a real scenario, you would fund the escrow by sending KAS to the funding address
# For testing, you would wait for the transaction and then call fund
echo "3. Simulating funding (in real usage, send KAS to $FUNDING_ADDR)"
echo "   To fund: curl -X POST http://localhost:3000/api/escrow -H 'Content-Type: application/json' -d '{\"action\":\"fund\",\"id\":\"$ESCROW_ID\",\"fundingTxId\":\"YOUR_TX_ID\"}'"
echo

# Get escrow status
echo "4. Checking escrow status..."
STATUS=$(curl -s "http://localhost:3000/api/escrow?id=$ESCROW_ID")
echo "$STATUS" | jq .
echo

# List all escrows
echo "5. Listing all escrows..."
ALL=$(curl -s "http://localhost:3000/api/escrow")
echo "$ALL" | jq '.escrows | length' -r
echo "   escrows in memory"
echo

echo "=== Test Complete ==="
echo "To test release/refund, you would:"
echo "  - Release: send preimage to claim funds"
echo "  - Refund: wait for timelock expiry after funding"