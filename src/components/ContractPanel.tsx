"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileCode2, Rocket, Play, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONTRACTS = [
  { id: "deadman2", name: "Deadman Switch v2", desc: "Owner/Beneficiary with timeout" },
  { id: "deadman", name: "Deadman Switch", desc: "Heartbeat + Claim + Cancel" },
  { id: "p2pkh", name: "P2PKH", desc: "Simple public key hash" },
  { id: "multisig", name: "Multisig (2-of-3)", desc: "Multi-signature" },
  { id: "escrow", name: "Escrow", desc: "Third-party arbiter" },
  { id: "hodl_vault", name: "HODL Vault", desc: "Time-locked vault" },
  { id: "mecenas", name: "Mecenas", desc: "Recurring payments" },
];

export default function ContractPanel() {
  const [selectedContract, setSelectedContract] = useState("deadman2");
  const [compiled, setCompiled] = useState<{
    contractName?: string;
    scriptHex?: string;
    address?: string;
    entrypoints?: string[];
  } | null>(null);
  const [ownerKey, setOwnerKey] = useState("");
  const [fundAmount, setFundAmount] = useState("10");
  const [logs, setLogs] = useState<{ msg: string; type: string; time: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addLog = useCallback((msg: string, type = "") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ msg, type, time }, ...prev.slice(0, 30)]);
  }, []);

  const compile = async () => {
    setLoading(true);
    addLog(`Compiling ${selectedContract}...`);
    try {
      const resp = await fetch("/api/contracts/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractType: selectedContract, args: {} }),
      });
      const data = await resp.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, "error");
      } else {
        setCompiled(data);
        addLog(`Compiled: ${data.contractName}`, "success");
        addLog(`Script: ${data.scriptHex?.substring(0, 40)}...`, "success");
        addLog(`Address: ${data.address}`, "success");
        if (data.entrypoints) {
          addLog(`Entrypoints: ${data.entrypoints.join(", ")}`, "success");
        }
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (compiled?.address) {
      navigator.clipboard.writeText(compiled.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      data-design-id="contract-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-5"
    >
      <div data-design-id="contract-header" className="flex items-center gap-2 mb-5">
        <FileCode2 className="w-5 h-5 text-violet-400" />
        <h2 className="text-sm font-bold tracking-wider text-violet-400 uppercase">SilverScript Contracts</h2>
        <span className="text-[10px] text-[hsl(0_0%_35%)] ml-2">Compile & Deploy</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div data-design-id="contract-controls">
          <div className="mb-4">
            <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">1. Owner Key</label>
            <Input
              data-design-id="contract-owner-key-input"
              value={ownerKey}
              onChange={(e) => setOwnerKey(e.target.value)}
              placeholder="Private key (hex)"
              className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9 font-mono placeholder:text-[hsl(0_0%_20%)]"
            />
          </div>

          <div className="mb-4">
            <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">2. Contract Type</label>
            <div data-design-id="contract-type-grid" className="grid grid-cols-2 gap-1.5">
              {CONTRACTS.map((c) => (
                <button
                  key={c.id}
                  data-design-id={`contract-type-${c.id}`}
                  onClick={() => setSelectedContract(c.id)}
                  className={`text-left p-2.5 rounded text-[10px] transition-all ${
                    selectedContract === c.id
                      ? "bg-violet-400/10 border border-violet-400/50 text-violet-400"
                      : "bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] text-[hsl(0_0%_55%)] hover:border-[hsl(0_0%_20%)]"
                  }`}
                >
                  <div className="font-bold">{c.name}</div>
                  <div className="text-[9px] opacity-60 mt-0.5">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">3. Funding (KAS)</label>
            <Input
              data-design-id="contract-fund-amount"
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9 w-32"
            />
          </div>

          <div data-design-id="contract-action-buttons" className="flex gap-2">
            <Button
              data-design-id="contract-compile-btn"
              onClick={compile}
              disabled={loading}
              className="flex-1 h-9 text-xs font-bold bg-violet-400/10 border border-violet-400/50 text-violet-400 hover:bg-violet-400/20"
            >
              <FileCode2 className="w-3 h-3 mr-1.5" /> Compile
            </Button>
            <Button
              data-design-id="contract-deploy-btn"
              disabled={!compiled}
              variant="outline"
              className="flex-1 h-9 text-xs border-[hsl(0_0%_15%)] hover:border-emerald-400/50 hover:text-emerald-400"
            >
              <Rocket className="w-3 h-3 mr-1.5" /> Deploy
            </Button>
          </div>
        </div>

        <div data-design-id="contract-output-section">
          {compiled && (
            <div data-design-id="contract-compiled-info" className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 mb-4">
              <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">Compiled Contract</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[hsl(0_0%_40%)]">NAME</span>
                  <span className="text-xs text-violet-400">{compiled.contractName}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-[hsl(0_0%_40%)]">ADDRESS</span>
                    <button onClick={copyAddress} className="text-[hsl(0_0%_30%)] hover:text-cyan-400 transition-colors">
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono break-all">{compiled.address}</div>
                </div>
                {compiled.entrypoints && (
                  <div>
                    <span className="text-[9px] text-[hsl(0_0%_40%)] block mb-1">ENTRYPOINTS</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {compiled.entrypoints.map((ep) => (
                        <Button
                          key={ep}
                          data-design-id={`contract-entrypoint-${ep}`}
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] border-[hsl(0_0%_15%)] hover:border-violet-400/50 hover:text-violet-400 px-2"
                        >
                          <Play className="w-2.5 h-2.5 mr-1" /> {ep}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div data-design-id="contract-logs">
            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">Output</div>
            <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-48 overflow-y-auto text-[10px] font-mono">
              {logs.length === 0 ? (
                <div className="text-[hsl(0_0%_25%)]">Compile output will appear here...</div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={`${log.time}-${i}`}
                    className={`mb-0.5 ${
                      log.type === "error" ? "text-red-400" :
                      log.type === "success" ? "text-emerald-400" :
                      "text-[hsl(0_0%_50%)]"
                    }`}
                  >
                    <span className="text-[hsl(0_0%_25%)]">[{log.time}]</span> {log.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}