"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Clock, Hash, ShieldCheck, Zap, Bot, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Swap {
  id: string;
  direction: string;
  amount: number;
  status: string;
  htlcAddress: string;
  hashlock: string;
  timelock: number;
  created: number;
}

export default function AtomicSwapPanel() {
  const [direction, setDirection] = useState<"kas2eth" | "eth2kas">("kas2eth");
  const [amount, setAmount] = useState("0.1");
  const [timelock, setTimelock] = useState("24");
  const [rate, setRate] = useState("0.00002");
  const [counterparty, setCounterparty] = useState("");
  const [intent, setIntent] = useState("");
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [activeSwap, setActiveSwap] = useState<{
    preimage?: string;
    hashlock?: string;
    htlcAddress?: string;
    status?: string;
  } | null>(null);
  const [logs, setLogs] = useState<{ msg: string; type: string; time: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const addLog = useCallback((msg: string, type = "") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ msg, type, time }, ...prev.slice(0, 50)]);
  }, []);

  const fetchSwaps = useCallback(async () => {
    try {
      const resp = await fetch("/api/atomic-swap/list");
      const data = await resp.json();
      setSwaps(data.swaps || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchSwaps();
    const interval = setInterval(fetchSwaps, 10000);
    return () => clearInterval(interval);
  }, [fetchSwaps]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const initiateSwap = async () => {
    if (!amount || Number(amount) <= 0) {
      addLog("Error: Valid amount required", "error");
      return;
    }
    setLoading(true);
    addLog(`Initiating ${direction} swap for ${amount}...`);
    try {
      const resp = await fetch("/api/atomic-swap/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          amount: Number.parseFloat(amount),
          timelock: Number.parseInt(timelock),
          rate: Number.parseFloat(rate),
          counterparty,
        }),
      });
      const data = await resp.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, "error");
      } else {
        addLog("Swap initiated!", "success");
        addLog(`Preimage: ${data.preimage}`, "success");
        addLog(`Hashlock: ${data.hashlock}`, "success");
        addLog(`HTLC: ${data.htlcAddress}`, "success");
        setActiveSwap({
          preimage: data.preimage,
          hashlock: data.hashlock,
          htlcAddress: data.htlcAddress,
          status: "INITIATED",
        });
        fetchSwaps();
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const claimSwap = async () => {
    if (!activeSwap?.preimage || swaps.length === 0) {
      addLog("Error: No active swap to claim", "error");
      return;
    }
    setLoading(true);
    const latestSwap = swaps[0];
    addLog(`Claiming swap ${latestSwap.id}...`);
    try {
      const resp = await fetch("/api/atomic-swap/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapId: latestSwap.id, preimage: activeSwap.preimage }),
      });
      const data = await resp.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, "error");
      } else {
        addLog(data.message, "success");
        setActiveSwap((prev) => prev ? { ...prev, status: "CLAIMED" } : null);
        fetchSwaps();
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const refundSwap = async () => {
    if (swaps.length === 0) {
      addLog("Error: No active swap to refund", "error");
      return;
    }
    setLoading(true);
    const latestSwap = swaps[0];
    addLog(`Refunding swap ${latestSwap.id}...`);
    try {
      const resp = await fetch("/api/atomic-swap/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapId: latestSwap.id }),
      });
      const data = await resp.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, "error");
      } else {
        addLog(data.message, "success");
        setActiveSwap((prev) => prev ? { ...prev, status: "REFUNDED" } : null);
        fetchSwaps();
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const executeIntent = async () => {
    if (!intent) {
      addLog("Error: Enter an intent", "error");
      return;
    }
    addLog(`🤖 Processing: ${intent}`);
    try {
      const resp = await fetch("/api/atomic-swap/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      const data = await resp.json();
      if (data.action) {
        addLog(`🤖 Action: ${data.action}`, "success");
        addLog(`Details: ${JSON.stringify(data.details)}`, "");
        if (data.details?.amount) setAmount(String(data.details.amount));
        if (data.details?.direction) setDirection(data.details.direction);
        if (data.details?.rate) setRate(String(data.details.rate));
      } else {
        addLog("Could not understand intent", "error");
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    }
  };

  return (
    <motion.div
      data-design-id="atomic-swap-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-5"
    >
      <div data-design-id="atomic-swap-header" className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">Atomic Swap</h2>
          <span className="text-[10px] text-[hsl(0_0%_35%)] ml-2">KAS ↔ ETH</span>
        </div>
        <Button
          data-design-id="atomic-swap-refresh-btn"
          variant="ghost"
          size="sm"
          onClick={fetchSwaps}
          className="h-7 text-xs text-[hsl(0_0%_45%)] hover:text-cyan-400"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div data-design-id="atomic-swap-controls">
          <div data-design-id="swap-direction-selector" className="mb-4">
            <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">1. Direction</label>
            <div className="flex gap-2">
              <button
                data-design-id="swap-dir-kas2eth"
                onClick={() => setDirection("kas2eth")}
                className={`flex-1 py-2.5 px-3 rounded text-xs font-bold transition-all ${
                  direction === "kas2eth"
                    ? "bg-emerald-400/10 border border-emerald-400/50 text-emerald-400"
                    : "bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] text-[hsl(0_0%_45%)] hover:border-[hsl(0_0%_20%)]"
                }`}
              >
                KAS → ETH
              </button>
              <button
                data-design-id="swap-dir-eth2kas"
                onClick={() => setDirection("eth2kas")}
                className={`flex-1 py-2.5 px-3 rounded text-xs font-bold transition-all ${
                  direction === "eth2kas"
                    ? "bg-violet-400/10 border border-violet-400/50 text-violet-400"
                    : "bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] text-[hsl(0_0%_45%)] hover:border-[hsl(0_0%_20%)]"
                }`}
              >
                ETH → KAS
              </button>
            </div>
          </div>

          <div data-design-id="swap-params" className="space-y-3 mb-4">
            <div>
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">2. Amount ({direction === "kas2eth" ? "KAS" : "ETH"})</label>
              <Input data-design-id="swap-amount-input" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">Timelock (hrs)</label>
                <Input data-design-id="swap-timelock-input" value={timelock} onChange={(e) => setTimelock(e.target.value)} className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9" />
              </div>
              <div>
                <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">Rate</label>
                <Input data-design-id="swap-rate-input" value={rate} onChange={(e) => setRate(e.target.value)} className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">3. Counterparty Address</label>
              <Input data-design-id="swap-counterparty-input" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="kaspatest:..." className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9 placeholder:text-[hsl(0_0%_20%)]" />
            </div>
          </div>

          <div data-design-id="swap-action-buttons" className="space-y-2 mb-4">
            <div className="flex gap-2">
              <Button
                data-design-id="swap-initiate-btn"
                onClick={initiateSwap}
                disabled={loading}
                className="flex-1 h-9 text-xs font-bold bg-emerald-400/10 border border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/20"
              >
                <Zap className="w-3 h-3 mr-1.5" /> Initiate Swap
              </Button>
              <Button
                data-design-id="swap-claim-btn"
                onClick={claimSwap}
                disabled={loading}
                variant="outline"
                className="flex-1 h-9 text-xs border-[hsl(0_0%_15%)] hover:border-cyan-400/50 hover:text-cyan-400"
              >
                <ShieldCheck className="w-3 h-3 mr-1.5" /> Claim
              </Button>
            </div>
            <Button
              data-design-id="swap-refund-btn"
              onClick={refundSwap}
              disabled={loading}
              variant="outline"
              className="w-full h-9 text-xs border-[hsl(0_0%_15%)] hover:border-amber-400/50 hover:text-amber-400"
            >
              <Clock className="w-3 h-3 mr-1.5" /> Refund (after timelock)
            </Button>
          </div>

          <div data-design-id="swap-ai-intent" className="border-t border-[hsl(0_0%_10%)] pt-4">
            <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Bot className="w-3 h-3 text-violet-400" /> AI Agent Intent
            </label>
            <div className="flex gap-2">
              <Input
                data-design-id="swap-intent-input"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="e.g., swap 1 KAS for ETH"
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9 placeholder:text-[hsl(0_0%_20%)]"
                onKeyDown={(e) => e.key === "Enter" && executeIntent()}
              />
              <Button
                data-design-id="swap-intent-btn"
                onClick={executeIntent}
                variant="outline"
                size="sm"
                className="h-9 text-xs border-violet-400/30 text-violet-400 hover:bg-violet-400/10"
              >
                Execute
              </Button>
            </div>
          </div>
        </div>

        <div data-design-id="atomic-swap-status">
          {activeSwap && (
            <div data-design-id="swap-details-card" className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 mb-4">
              <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">Swap Details</div>
              <div className="space-y-2.5">
                {[
                  { label: "STATUS", value: activeSwap.status || "—", color: activeSwap.status === "CLAIMED" ? "text-emerald-400" : activeSwap.status === "REFUNDED" ? "text-amber-400" : "text-cyan-400" },
                  { label: "HTLC ADDRESS", value: activeSwap.htlcAddress || "—", copyable: true, key: "htlc" },
                  { label: "HASHLOCK", value: activeSwap.hashlock || "—", copyable: true, key: "hashlock" },
                  { label: "PREIMAGE", value: activeSwap.preimage || "—", copyable: true, key: "preimage" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-2">
                    <span className="text-[9px] text-[hsl(0_0%_40%)] shrink-0 mt-0.5">{item.label}</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-[10px] font-mono truncate ${item.color || "text-emerald-400"}`}>
                        {item.value.length > 30 ? `${item.value.substring(0, 15)}...${item.value.substring(item.value.length - 15)}` : item.value}
                      </span>
                      {item.copyable && item.value !== "—" && (
                        <button onClick={() => copyText(item.value, item.key!)} className="shrink-0 text-[hsl(0_0%_30%)] hover:text-cyan-400 transition-colors">
                          {copied === item.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div data-design-id="swap-list" className="mb-4">
            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">Active Swaps ({swaps.length})</div>
            <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg max-h-40 overflow-y-auto">
              {swaps.length === 0 ? (
                <div className="p-4 text-center text-xs text-[hsl(0_0%_30%)]">No active swaps</div>
              ) : (
                <div className="divide-y divide-[hsl(0_0%_8%)]">
                  {swaps.map((swap) => (
                    <div key={swap.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400">{swap.direction.toUpperCase()}</span>
                        <span className="text-[10px] text-[hsl(0_0%_45%)] ml-2">{swap.amount}</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded ${
                        swap.status === "claimed" ? "bg-emerald-400/10 text-emerald-400" :
                        swap.status === "refunded" ? "bg-amber-400/10 text-amber-400" :
                        "bg-cyan-400/10 text-cyan-400"
                      }`}>
                        {swap.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div data-design-id="swap-logs">
            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">Log</div>
            <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-40 overflow-y-auto text-[10px] font-mono">
              <AnimatePresence>
                {logs.length === 0 ? (
                  <div className="text-[hsl(0_0%_25%)]">Output will appear here...</div>
                ) : (
                  logs.map((log, i) => (
                    <motion.div
                      key={`${log.time}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`mb-0.5 ${
                        log.type === "error" ? "text-red-400" :
                        log.type === "success" ? "text-emerald-400" :
                        "text-[hsl(0_0%_50%)]"
                      }`}
                    >
                      <span className="text-[hsl(0_0%_25%)]">[{log.time}]</span> {log.msg}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}