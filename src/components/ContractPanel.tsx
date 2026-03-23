"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type CompileResult, compileScript } from "@/lib/silver-script";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  FileCode2,
  FolderOpen,
  Play,
  Rocket,
  Save,
  Sparkles,
} from "lucide-react";
import { useCallback, useState } from "react";
import ContractTemplates from "./ContractTemplates";
import ContractWizard from "./ContractWizard";
import SilverEditor from "./SilverEditor";

interface SavedContract {
  id: string;
  name: string;
  address: string;
  scriptHex: string;
  createdAt: string;
  description: string;
}

export default function ContractPanel() {
  const [code, setCode] = useState("");
  const [ownerKey, setOwnerKey] = useState("");
  const [fundAmount, setFundAmount] = useState("0.1");
  const [fundingAddress, setFundingAddress] = useState("");
  const [logs, setLogs] = useState<
    { msg: string; type: string; time: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [deployed, setDeployed] = useState<{
    txId: string;
    address: string;
    explorerUrl: string;
  } | null>(null);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(
    null,
  );
  const [makeAtomicSwap, setMakeAtomicSwap] = useState(false);
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([]);
  const [activeTab, setActiveTab] = useState<"editor" | "ai" | "saved">(
    "editor",
  );

  const addLog = useCallback((msg: string, type = "") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ msg, type, time }, ...prev.slice(0, 30)]);
  }, []);

  const handleCompile = useCallback(
    (result: CompileResult) => {
      setCompileResult(result);
      if (result.success) {
        addLog(`Compiled: ${result.address}`, "success");
        if (result.warnings && result.warnings.length > 0) {
          for (const w of result.warnings) {
            addLog(`Warning: ${w}`, "warning");
          }
        }
      } else {
        addLog(`Error: ${result.error}`, "error");
      }
    },
    [addLog],
  );

  const handleDeploy = async () => {
    if (!compileResult?.success || !compileResult.scriptHex) {
      addLog("No compiled script to deploy", "error");
      return;
    }

    setLoading(true);
    addLog("Deploying to testnet-12...", "");
    try {
      const resp = await fetch("/api/contracts/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptHex: compileResult.scriptHex,
          fundingAmount: fundAmount,
          ownerKey,
          network: "testnet-12",
        }),
      });
      const data = await resp.json();
      if (data.error) {
        addLog(`Error: ${data.error}`, "error");
      } else {
        setDeployed(data);
        addLog(`Deployed: ${data.txId}`, "success");
        addLog(`Address: ${data.address}`, "success");
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!compileResult?.success) return;
    const contract: SavedContract = {
      id: Date.now().toString(),
      name: compileResult.address?.slice(0, 16) || "Untitled",
      address: compileResult.address || "",
      scriptHex: compileResult.scriptHex || "",
      createdAt: new Date().toISOString(),
      description: code.slice(0, 100),
    };
    setSavedContracts([contract, ...savedContracts]);
    addLog("Contract saved", "success");
  };

  const handleLoadContract = (contract: SavedContract) => {
    setCode(contract.scriptHex);
    setFundingAddress(contract.address);
    setActiveTab("editor");
    addLog(`Loaded: ${contract.name}`, "success");
  };

  const handleDeleteContract = (id: string) => {
    setSavedContracts(savedContracts.filter((c) => c.id !== id));
  };

  const handleWizardGenerate = (script: string) => {
    setCode(script);
    addLog("Wizard generated contract", "success");
  };

  return (
    <motion.div
      data-design-id="contract-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 h-[calc(100vh-140px)] min-h-[600px]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-5 h-5 text-violet-400" />
          <h2 className="text-sm font-bold tracking-wider text-violet-400 uppercase">
            SilverScript Studio
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[hsl(0_0%_45%)]">Atomic Swap</span>
            <Switch
              checked={makeAtomicSwap}
              onCheckedChange={setMakeAtomicSwap}
              className="h-4 w-7 data-[state=checked]:bg-emerald-400"
            />
          </div>
          <Button
            onClick={() => setActiveTab("ai")}
            className="h-8 text-xs bg-violet-400/10 border border-violet-400/50 text-violet-400 hover:bg-violet-400/20"
          >
            <Sparkles className="w-3 h-3 mr-1.5" /> AI Generator
          </Button>
          <Button
            onClick={() => setActiveTab("editor")}
            variant="outline"
            className="h-8 text-xs border-[hsl(0_0%_15%)]"
          >
            <Play className="w-3 h-3 mr-1.5" /> Editor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-full">
        <div className="col-span-3 border-r border-[hsl(0_0%_10%)] pr-3 overflow-y-auto">
          <ContractTemplates
            onSelect={(template) => {
              setCode(template.script);
              addLog(`Loaded template: ${template.name}`, "success");
            }}
          />

          <div className="mt-4 pt-4 border-t border-[hsl(0_0%_10%)]">
            <ContractWizard onGenerate={handleWizardGenerate} />
          </div>

          <div className="mt-4 pt-4 border-t border-[hsl(0_0%_10%)]">
            <button
              onClick={() => setActiveTab("saved")}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-[hsl(0_0%_45%)] hover:text-violet-400"
            >
              <FolderOpen className="w-3 h-3" />
              <span>My Contracts ({savedContracts.length})</span>
            </button>

            {activeTab === "saved" && (
              <div className="mt-2 space-y-2">
                {savedContracts.length === 0 ? (
                  <div className="text-[9px] text-[hsl(0_0%_30%)] px-2">
                    No saved contracts
                  </div>
                ) : (
                  savedContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-2 bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded text-[9px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-violet-400 truncate">
                          {contract.name}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleLoadContract(contract)}
                            className="text-[hsl(0_0%_40%)] hover:text-violet-400"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="text-[hsl(0_0%_40%)] hover:text-red-400"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                      <div className="text-[hsl(0_0%_30%)] truncate mt-1 font-mono">
                        {contract.address}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-6 flex flex-col min-h-0">
          {activeTab === "editor" && (
            <SilverEditor
              initialCode={code}
              onChange={setCode}
              onCompile={handleCompile}
            />
          )}

          {activeTab === "ai" && (
            <div className="flex-1 flex flex-col">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Describe your contract in plain English... e.g., 'Create an escrow where funds are released when buyer and seller both sign, with a 24-hour timeout for automatic refund to buyer'"
                className="flex-1 bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs resize-none placeholder:text-[hsl(0_0%_20%)] min-h-[200px]"
              />
              <Button
                onClick={async () => {
                  if (!code.trim()) return;
                  setLoading(true);
                  addLog("Generating with AI...", "");
                  try {
                    const resp = await fetch("/api/contracts/ai-generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ prompt: code }),
                    });
                    const data = await resp.json();
                    if (data.error) {
                      addLog(`Error: ${data.error}`, "error");
                    } else {
                      setCode(data.scriptTemplate || data.scriptHex || "");
                      setFundingAddress(data.address || "");
                      addLog("AI generated contract", "success");
                    }
                  } catch (e: unknown) {
                    addLog(`Error: ${(e as Error).message}`, "error");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !code.trim()}
                className="mt-3 h-10 text-xs font-bold bg-violet-400/10 border border-violet-400/50 text-violet-400 hover:bg-violet-400/20"
              >
                <Sparkles className="w-3 h-3 mr-1.5" />{" "}
                {loading ? "Generating..." : "Generate with AI"}
              </Button>
            </div>
          )}
        </div>

        <div className="col-span-3 border-l border-[hsl(0_0%_10%)] pl-3 flex flex-col">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1.5">
                Owner Key (hex)
              </label>
              <Input
                value={ownerKey}
                onChange={(e) => setOwnerKey(e.target.value)}
                placeholder="Private key (optional)"
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-8 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1.5">
                Funding (KAS)
              </label>
              <Input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-8"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!compileResult?.success}
                variant="outline"
                className="flex-1 h-8 text-xs border-[hsl(0_0%_15%)]"
              >
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={loading || !compileResult?.success}
                className="flex-1 h-8 text-xs bg-emerald-400/10 border border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/20"
              >
                <Rocket className="w-3 h-3 mr-1" />{" "}
                {loading ? "Deploying..." : "Deploy"}
              </Button>
            </div>
          </div>

          {deployed && (
            <div className="mt-4 p-3 bg-emerald-400/5 border border-emerald-400/30 rounded-lg">
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-2">
                Deployed!
              </div>
              <div className="text-[9px] text-[hsl(0_0%_60%)] mb-1">TX ID</div>
              <div className="text-[8px] text-emerald-400 font-mono break-all mb-2">
                {deployed.txId}
              </div>
              <div className="text-[9px] text-[hsl(0_0%_60%)] mb-1">
                Address
              </div>
              <div className="text-[8px] text-emerald-400 font-mono break-all">
                {deployed.address}
              </div>
              <a
                href={deployed.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-violet-400 hover:underline mt-2 block"
              >
                View in Explorer →
              </a>
            </div>
          )}

          <div className="mt-auto pt-4">
            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
              Output
            </div>
            <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-40 overflow-y-auto text-[10px] font-mono">
              {logs.length === 0 ? (
                <div className="text-[hsl(0_0%_25%)]">
                  Operations will appear here...
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
                          : log.type === "warning"
                            ? "text-amber-400"
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
    </motion.div>
  );
}
