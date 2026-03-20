"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, RefreshCw, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WalletCardProps {
  id: string;
  title: string;
  defaultAddress?: string;
  delay?: number;
}

export default function WalletCard({ id, title, defaultAddress = "", delay = 0 }: WalletCardProps) {
  const [address, setAddress] = useState(defaultAddress);
  const [balance, setBalance] = useState<string>("—");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const addr = address.startsWith("kaspatest:") ? address : `kaspatest:${address}`;
      const resp = await fetch(`/api/wallet/balance?address=${encodeURIComponent(addr)}`);
      const data = await resp.json();
      if (data.error) {
        setBalance("Error");
      } else {
        setBalance(`${data.balance.toFixed(4)} TKAS`);
      }
    } catch {
      setBalance("Error");
    } finally {
      setLoading(false);
    }
  }, [address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      data-design-id={`wallet-card-${id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 hover:border-[hsl(0_0%_15%)] transition-all"
    >
      <div data-design-id={`wallet-card-header-${id}`} className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-emerald-400" />
        <span className="text-xs tracking-wider text-cyan-400 uppercase font-bold">{title}</span>
      </div>

      <Input
        data-design-id={`wallet-input-${id}`}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="kaspatest:..."
        className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs font-mono mb-3 h-9 placeholder:text-[hsl(0_0%_25%)]"
      />

      <div data-design-id={`wallet-balance-row-${id}`} className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider">Balance</span>
        <span className="text-sm font-bold text-emerald-400">{balance}</span>
      </div>

      <div data-design-id={`wallet-actions-${id}`} className="flex gap-2">
        <Button
          data-design-id={`wallet-refresh-btn-${id}`}
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="flex-1 h-8 text-xs bg-transparent border-[hsl(0_0%_15%)] hover:bg-[hsl(0_0%_8%)] hover:border-emerald-400/50 hover:text-emerald-400"
        >
          <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "..." : "Refresh"}
        </Button>
        <Button
          data-design-id={`wallet-copy-btn-${id}`}
          variant="outline"
          size="sm"
          onClick={copyAddress}
          disabled={!address}
          className="h-8 text-xs bg-transparent border-[hsl(0_0%_15%)] hover:bg-[hsl(0_0%_8%)] hover:border-cyan-400/50 hover:text-cyan-400"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
    </motion.div>
  );
}