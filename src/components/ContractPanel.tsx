"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  FileCode2,
  FolderOpen,
  Play,
  Plus,
  Rocket,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";

const CONTRACTS = [
  {
    id: "deadman2",
    name: "Deadman Switch v2",
    desc: "Owner/Beneficiary with timeout",
  },
  { id: "deadman", name: "Deadman Switch", desc: "Heartbeat + Claim + Cancel" },
  { id: "p2pkh", name: "P2PKH", desc: "Simple public key hash" },
  { id: "multisig", name: "Multisig (2-of-3)", desc: "Multi-signature" },
  { id: "escrow", name: "Escrow", desc: "Third-party arbiter" },
  { id: "hodl_vault", name: "HODL Vault", desc: "Time-locked vault" },
  { id: "mecenas", name: "Mecenas", desc: "Recurring payments" },
];

const AI_TEMPLATES = [
  {
    id: "escrow-ai",
    name: "Smart Escrow",
    prompt:
      "Create a 2-of-3 multisig escrow contract where funds are held until either the buyer and seller both sign for release, or a timeout triggers refund to the buyer.",
  },
  {
    id: "timelock-ai",
    name: "Time-Locked Vault",
    prompt:
      "Create a time-locked vault where funds can only be withdrawn by the owner after a specified number of blocks, with an emergency recovery key.",
  },
  {
    id: "recurring-ai",
    name: "Recurring Payment",
    prompt:
      "Create a recurring payment contract where funds are automatically released to a recipient at regular intervals, with the ability for the payer to cancel at any time.",
  },
  {
    id: "hashlock-ai",
    name: "Hash-Locked Swap",
    prompt:
      "Create an atomic swap contract where the recipient must provide the preimage of a hash within a timeout to claim funds, otherwise funds return to sender.",
  },
  {
    id: "deadman-ai",
    name: "Dead Man's Switch",
    prompt:
      "Create a dead man's switch where if the owner doesn't submit a heartbeat transaction within a set number of blocks, the beneficiary can claim the funds.",
  },
  {
    id: "vesting-ai",
    name: "Vesting Schedule",
    prompt:
      "Create a vesting contract where funds are locked and released incrementally over time to a beneficiary, with the owner retaining the ability to revoke.",
  },
];

interface SavedContract {
  id: string;
  name: string;
  type: string;
  address: string;
  scriptHex: string;
  createdAt: string;
  description: string;
}

export default function ContractPanel() {
  const [activeTab, setActiveTab] = useState<"compile" | "ai" | "saved">(
    "compile",
  );
  const [selectedContract, setSelectedContract] = useState("deadman2");
  const [compiled, setCompiled] = useState<{
    contractName?: string;
    scriptHex?: string;
    address?: string;
    entrypoints?: string[];
  } | null>(null);
  const [ownerKey, setOwnerKey] = useState("");
  const [fundAmount, setFundAmount] = useState("10");
  const [logs, setLogs] = useState<
    { msg: string; type: string; time: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    description: string;
    scriptHex: string;
    address: string;
  } | null>(null);
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([]);

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

  const generateWithAI = async (templatePrompt?: string) => {
    const prompt = templatePrompt || aiPrompt;
    if (!prompt.trim()) return;

    setAiLoading(true);
    addLog("Generating contract with AI...", "");
    try {
      const resp = await fetch("/api/contracts/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, "error");
      } else {
        setAiResult(data);
        addLog("AI contract generated successfully", "success");
        addLog(`Address: ${data.address}`, "success");
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const saveContract = () => {
    if (!aiResult && !compiled) return;
    const isAi = !!aiResult;
    const contract = isAi ? aiResult : compiled;
    if (!contract) return;

    const newContract: SavedContract = {
      id: Date.now().toString(),
      name: isAi ? "AI Contract" : compiled?.contractName || "Untitled",
      type: isAi ? "ai-generated" : selectedContract,
      address: contract.address || "",
      scriptHex: contract.scriptHex || "",
      createdAt: new Date().toISOString(),
      description: aiPrompt || `Contract type: ${selectedContract}`,
    };
    setSavedContracts([newContract, ...savedContracts]);
    addLog("Contract saved", "success");
  };

  const deleteSavedContract = (id: string) => {
    setSavedContracts(savedContracts.filter((c) => c.id !== id));
  };

  const loadSavedContract = (contract: SavedContract) => {
    setCompiled({
      contractName: contract.name,
      address: contract.address,
      scriptHex: contract.scriptHex,
    });
    setSelectedContract(contract.type);
    setActiveTab("compile");
    addLog(`Loaded: ${contract.name}`, "success");
  };

  return (
    <motion.div
      data-design-id="contract-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-5"
    >
      <div
        data-design-id="contract-header"
        className="flex items-center gap-2 mb-5"
      >
        <FileCode2 className="w-5 h-5 text-violet-400" />
        <h2 className="text-sm font-bold tracking-wider text-violet-400 uppercase">
          SilverScript Contracts
        </h2>
        <span className="text-[10px] text-[hsl(0_0%_35%)] ml-2">
          Compile & Deploy
        </span>
      </div>

      <div className="flex gap-1 mb-5 border-b border-[hsl(0_0%_10%)]">
        <button
          onClick={() => setActiveTab("compile")}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === "compile"
              ? "text-violet-400 border-b-2 border-violet-400"
              : "text-[hsl(0_0%_45%)] hover:text-[hsl(0_0%_60%)]"
          }`}
        >
          <FileCode2 className="w-3 h-3 inline mr-1.5" /> File Editor
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === "ai"
              ? "text-violet-400 border-b-2 border-violet-400"
              : "text-[hsl(0_0%_45%)] hover:text-[hsl(0_0%_60%)]"
          }`}
        >
          <Sparkles className="w-3 h-3 inline mr-1.5" /> AI Generator
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === "saved"
              ? "text-violet-400 border-b-2 border-violet-400"
              : "text-[hsl(0_0%_45%)] hover:text-[hsl(0_0%_60%)]"
          }`}
        >
          <FolderOpen className="w-3 h-3 inline mr-1.5" /> My Contracts
        </button>
      </div>

      {activeTab === "compile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-design-id="contract-controls">
            <div className="mb-4">
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">
                1. Owner Key
              </label>
              <Input
                data-design-id="contract-owner-key-input"
                value={ownerKey}
                onChange={(e) => setOwnerKey(e.target.value)}
                placeholder="Private key (hex)"
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9 font-mono placeholder:text-[hsl(0_0%_20%)]"
              />
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">
                2. Contract Type
              </label>
              <div
                data-design-id="contract-type-grid"
                className="grid grid-cols-2 gap-1.5"
              >
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
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">
                3. Funding (KAS)
              </label>
              <Input
                data-design-id="contract-fund-amount"
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9 w-32"
              />
            </div>

            <div
              data-design-id="contract-action-buttons"
              className="flex gap-2"
            >
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
              <div
                data-design-id="contract-compiled-info"
                className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 mb-4"
              >
                <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">
                  Compiled Contract
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[hsl(0_0%_40%)]">
                      NAME
                    </span>
                    <span className="text-xs text-violet-400">
                      {compiled.contractName}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-[hsl(0_0%_40%)]">
                        ADDRESS
                      </span>
                      <button
                        onClick={copyAddress}
                        className="text-[hsl(0_0%_30%)] hover:text-cyan-400 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono break-all">
                      {compiled.address}
                    </div>
                  </div>
                  {compiled.entrypoints && (
                    <div>
                      <span className="text-[9px] text-[hsl(0_0%_40%)] block mb-1">
                        ENTRYPOINTS
                      </span>
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
              <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
                Output
              </div>
              <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-48 overflow-y-auto text-[10px] font-mono">
                {logs.length === 0 ? (
                  <div className="text-[hsl(0_0%_25%)]">
                    Compile output will appear here...
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={`${log.time}-${i}`}
                      className={`mb-0.5 ${
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                            ? "text-emerald-400"
                            : "text-[hsl(0_0%_50%)]"
                      }`}
                    >
                      <span className="text-[hsl(0_0%_25%)]">[{log.time}]</span>{" "}
                      {log.msg}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-design-id="ai-generator-panel">
            <div className="mb-4">
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">
                Describe Your Contract
              </label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Create an escrow contract where funds are released when both buyer and seller sign, with a 24-hour timeout for automatic refund..."
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-32 resize-none placeholder:text-[hsl(0_0%_20%)]"
              />
            </div>

            <div className="mb-4">
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-2">
                Quick Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AI_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setAiPrompt(t.prompt);
                      generateWithAI(t.prompt);
                    }}
                    className="text-left p-3 rounded bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] hover:border-violet-400/50 transition-all"
                  >
                    <div className="text-[10px] text-violet-400 font-medium">
                      {t.name}
                    </div>
                    <div className="text-[8px] text-[hsl(0_0%_35%)] mt-1 line-clamp-2">
                      {t.prompt.substring(0, 60)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => generateWithAI()}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full h-10 text-xs font-bold bg-violet-400/10 border border-violet-400/50 text-violet-400 hover:bg-violet-400/20"
            >
              {aiLoading ? (
                <>Generating...</>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1.5" /> Generate with AI
                </>
              )}
            </Button>
          </div>

          <div data-design-id="ai-result-panel">
            {aiResult && (
              <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider">
                    Generated Contract
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveContract}
                    className="h-6 text-[10px] border-[hsl(0_0%_15%)] hover:border-violet-400/50"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Save
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] text-[hsl(0_0%_40%)] block mb-1">
                      DESCRIPTION
                    </span>
                    <div className="text-xs text-[hsl(0_0%_60%)]">
                      {aiResult.description}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-[hsl(0_0%_40%)]">
                        ADDRESS
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiResult.address);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="text-[hsl(0_0%_30%)] hover:text-cyan-400"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono break-all">
                      {aiResult.address}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-[hsl(0_0%_40%)] block mb-1">
                      SCRIPT HEX
                    </span>
                    <div className="text-[8px] text-cyan-400 font-mono break-all bg-[hsl(0_0%_2%)] p-2 rounded max-h-20 overflow-y-auto">
                      {aiResult.scriptHex}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
              Output
            </div>
            <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-48 overflow-y-auto text-[10px] font-mono">
              {logs.length === 0 ? (
                <div className="text-[hsl(0_0%_25%)]">
                  AI generation output will appear here...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={`${log.time}-${i}`}
                    className={`mb-0.5 ${
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                          ? "text-emerald-400"
                          : "text-[hsl(0_0%_50%)]"
                    }`}
                  >
                    <span className="text-[hsl(0_0%_25%)]">[{log.time}]</span>{" "}
                    {log.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "saved" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div data-design-id="saved-contracts-list">
            {savedContracts.length === 0 ? (
              <div className="text-center py-12 text-[hsl(0_0%_35%)]">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <div className="text-xs">No saved contracts yet</div>
                <div className="text-[10px] mt-1">
                  Generate or compile a contract and save it
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {savedContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 hover:border-violet-400/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-violet-400 font-medium">
                          {contract.name}
                        </div>
                        <div className="text-[9px] text-[hsl(0_0%_40%)] mt-1">
                          {contract.type}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSavedContract(contract)}
                          className="h-7 text-[10px] border-[hsl(0_0%_15%)] hover:border-violet-400/50"
                        >
                          Load
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSavedContract(contract.id)}
                          className="h-7 text-[10px] border-[hsl(0_0%_15%)] hover:border-red-400/50 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-[8px] text-[hsl(0_0%_30%)] mt-2 font-mono truncate">
                      {contract.address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div data-design-id="saved-contract-details">
            {savedContracts.length > 0 && (
              <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
                <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">
                  Saved Contracts ({savedContracts.length})
                </div>
                <div className="text-[9px] text-[hsl(0_0%_40%)]">
                  Click "Load" to load a contract into the compiler, or "Delete"
                  to remove it.
                </div>
              </div>
            )}
            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2 mt-4">
              Output
            </div>
            <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-48 overflow-y-auto text-[10px] font-mono">
              {logs.length === 0 ? (
                <div className="text-[hsl(0_0%_25%)]">
                  Contract operations will appear here...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={`${log.time}-${i}`}
                    className={`mb-0.5 ${
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                          ? "text-emerald-400"
                          : "text-[hsl(0_0%_50%)]"
                    }`}
                  >
                    <span className="text-[hsl(0_0%_25%)]">[{log.time}]</span>{" "}
                    {log.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
