"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Terminal, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RPC_METHODS = [
  { value: "get_info", label: "get_info — Node info" },
  { value: "get_block_dag_info", label: "get_block_dag_info — DAG info" },
  { value: "get_block_count", label: "get_block_count — Block count" },
  { value: "get_balance_by_address", label: "get_balance_by_address — Balance", needsAddress: true },
  { value: "get_utxos_by_addresses", label: "get_utxos_by_addresses — UTXOs", needsAddress: true },
  { value: "get_fee_estimate", label: "get_fee_estimate — Fee estimate" },
];

export default function RPCTester() {
  const [method, setMethod] = useState("get_info");
  const [address, setAddress] = useState("");
  const [output, setOutput] = useState<string>("Click 'Run RPC' to test...");
  const [loading, setLoading] = useState(false);
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [consoleInput, setConsoleInput] = useState("");

  const selectedMethod = RPC_METHODS.find((m) => m.value === method);

  const runRPC = useCallback(async () => {
    setLoading(true);
    const params = selectedMethod?.needsAddress && address ? { address } : {};
    setOutput(`Calling ${method}...\n\nRequest: ${JSON.stringify({ method, params }, null, 2)}\n\n`);

    try {
      const resp = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params: selectedMethod?.needsAddress ? address : undefined }),
      });
      const data = await resp.json();
      setOutput((prev) => `${prev}Response:\n${JSON.stringify(data, null, 2)}`);
    } catch (e: unknown) {
      setOutput((prev) => `${prev}Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [method, address, selectedMethod]);

  const runConsoleCommand = async () => {
    if (!consoleInput.trim()) return;
    const cmd = consoleInput.trim();
    setConsoleHistory((prev) => [`$ ${cmd}`, ...prev]);
    setConsoleInput("");

    if (cmd.startsWith("balance ") || cmd.startsWith("bal ")) {
      const addr = cmd.replace(/^(balance|bal)\s+/, "");
      try {
        const resp = await fetch(`/api/wallet/balance?address=${encodeURIComponent(addr)}`);
        const data = await resp.json();
        setConsoleHistory((prev) => [
          data.error ? `Error: ${data.error}` : `Balance: ${data.balance?.toFixed(4)} TKAS`,
          ...prev,
        ]);
      } catch (e: unknown) {
        setConsoleHistory((prev) => [`Error: ${(e as Error).message}`, ...prev]);
      }
    } else if (cmd === "info" || cmd === "network") {
      try {
        const resp = await fetch("/api/network/info");
        const data = await resp.json();
        setConsoleHistory((prev) => [
          `Blocks: ${data.blockCount} | DAA: ${data.virtualDaaScore} | Network: ${data.networkName}`,
          ...prev,
        ]);
      } catch (e: unknown) {
        setConsoleHistory((prev) => [`Error: ${(e as Error).message}`, ...prev]);
      }
    } else if (cmd === "help") {
      setConsoleHistory((prev) => [
        "Commands: balance <addr> | info | help | clear | swaps",
        ...prev,
      ]);
    } else if (cmd === "clear") {
      setConsoleHistory([]);
    } else if (cmd === "swaps") {
      try {
        const resp = await fetch("/api/atomic-swap/list");
        const data = await resp.json();
        setConsoleHistory((prev) => [
          `Active swaps: ${data.swaps?.length || 0}`,
          ...prev,
        ]);
      } catch {
        setConsoleHistory((prev) => ["Error fetching swaps", ...prev]);
      }
    } else {
      setConsoleHistory((prev) => [`Unknown command: ${cmd}. Type 'help' for available commands.`, ...prev]);
    }
  };

  return (
    <motion.div
      data-design-id="rpc-tester-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-5"
    >
      <div data-design-id="rpc-tester-header" className="flex items-center gap-2 mb-5">
        <Terminal className="w-5 h-5 text-emerald-400" />
        <h2 className="text-sm font-bold tracking-wider text-emerald-400 uppercase">RPC Tester & Console</h2>
        <span className="text-[10px] text-[hsl(0_0%_35%)] ml-2">wRPC</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div data-design-id="rpc-controls">
          <div className="mb-4">
            <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">RPC Method</label>
            <div data-design-id="rpc-method-list" className="space-y-1">
              {RPC_METHODS.map((m) => (
                <button
                  key={m.value}
                  data-design-id={`rpc-method-${m.value}`}
                  onClick={() => setMethod(m.value)}
                  className={`w-full text-left px-3 py-2 rounded text-[10px] transition-all ${
                    method === m.value
                      ? "bg-emerald-400/10 border border-emerald-400/50 text-emerald-400"
                      : "bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_8%)] text-[hsl(0_0%_50%)] hover:border-[hsl(0_0%_15%)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {selectedMethod?.needsAddress && (
            <div className="mb-4">
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">Address</label>
              <Input
                data-design-id="rpc-address-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="kaspatest:..."
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9 placeholder:text-[hsl(0_0%_20%)]"
              />
            </div>
          )}

          <Button
            data-design-id="rpc-run-btn"
            onClick={runRPC}
            disabled={loading}
            className="w-full h-9 text-xs font-bold bg-emerald-400/10 border border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/20"
          >
            <Play className="w-3 h-3 mr-1.5" /> {loading ? "Running..." : "Run RPC"}
          </Button>

          <div data-design-id="rpc-port-info" className="mt-4 bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_8%)] rounded-lg p-3">
            <div className="text-[9px] text-emerald-400 font-bold mb-1">📡 PORTS (TN12 / v1.1.0)</div>
            <div className="text-[9px] text-[hsl(0_0%_40%)] leading-relaxed">
              gRPC: 16210 | wRPC-Borsh: 17210 | wRPC-JSON: 18210
            </div>
            <div className="text-[9px] text-amber-400 mt-1">⚠️ Proxy uses public api-tn12.kaspa.org</div>
          </div>
        </div>

        <div data-design-id="rpc-output-section" className="space-y-4">
          <div>
            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">RPC Response</div>
            <div
              data-design-id="rpc-output"
              className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-52 overflow-y-auto text-[10px] font-mono text-emerald-400 whitespace-pre-wrap break-all"
            >
              {output}
            </div>
          </div>

          <div>
            <div data-design-id="console-header" className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider">Console</span>
              <button onClick={() => setConsoleHistory([])} className="text-[hsl(0_0%_30%)] hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div data-design-id="console-output" className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-32 overflow-y-auto text-[10px] font-mono mb-2">
              {consoleHistory.length === 0 ? (
                <div className="text-[hsl(0_0%_25%)]">Type &apos;help&apos; for available commands</div>
              ) : (
                consoleHistory.map((line, i) => (
                  <div key={i} className={line.startsWith("$") ? "text-cyan-400" : line.startsWith("Error") ? "text-red-400" : "text-emerald-400"}>
                    {line}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                data-design-id="console-input"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runConsoleCommand()}
                placeholder="balance kaspatest:... | info | help"
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-8 placeholder:text-[hsl(0_0%_20%)]"
              />
              <Button
                data-design-id="console-run-btn"
                onClick={runConsoleCommand}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-[hsl(0_0%_15%)] hover:border-emerald-400/50 hover:text-emerald-400 px-3"
              >
                Run
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}