"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Heart, Clock, AlertTriangle, Settings, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DeadmanStatus {
  status: "active" | "grace" | "expired" | "unconfigured";
  remaining: number;
  graceRemaining: number;
  lastHeartbeat: string;
  timeoutPeriod: number;
  gracePeriod: number;
  contractAddress: string;
  beneficiary: string;
}

export default function DeadmanSwitch() {
  const [status, setStatus] = useState<DeadmanStatus | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [timeoutPeriod, setTimeoutPeriod] = useState("600");
  const [gracePeriod, setGracePeriod] = useState("60");
  const [heartbeatLoading, setHeartbeatLoading] = useState(false);
  const [logs, setLogs] = useState<{ msg: string; type: string; time: string }[]>([]);

  const addLog = useCallback((msg: string, type = "") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ msg, type, time }, ...prev.slice(0, 30)]);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch("/api/deadman/status");
      const data = await resp.json();
      setStatus(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const sendHeartbeat = async () => {
    setHeartbeatLoading(true);
    addLog("❤️ Sending heartbeat...");
    try {
      const resp = await fetch("/api/deadman/heartbeat", { method: "POST" });
      const data = await resp.json();
      if (data.success) {
        addLog(`Heartbeat received! Timer reset to ${data.remaining}s`, "success");
        fetchStatus();
      } else {
        addLog(`Error: ${data.error}`, "error");
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    } finally {
      setHeartbeatLoading(false);
    }
  };

  const saveConfig = async () => {
    addLog("Saving configuration...");
    try {
      const resp = await fetch("/api/deadman/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          beneficiary,
          timeoutPeriod: Number(timeoutPeriod),
          gracePeriod: Number(gracePeriod),
        }),
      });
      const data = await resp.json();
      if (data.success) {
        addLog("Configuration saved!", "success");
        setConfigOpen(false);
        fetchStatus();
      }
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`, "error");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const statusColor = status?.status === "active" ? "text-emerald-400" :
    status?.status === "grace" ? "text-amber-400" :
    status?.status === "expired" ? "text-red-400" :
    "text-[hsl(0_0%_40%)]";

  const statusBg = status?.status === "active" ? "border-emerald-400/30" :
    status?.status === "grace" ? "border-amber-400/30" :
    status?.status === "expired" ? "border-red-400/30" :
    "border-[hsl(0_0%_15%)]";

  return (
    <motion.div
      data-design-id="deadman-switch-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-5"
    >
      <div data-design-id="deadman-header" className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wider text-amber-400 uppercase">Deadman Switch</h2>
          <span className="text-[10px] text-[hsl(0_0%_35%)] ml-2">Guardian Estate Protector</span>
        </div>
        <Button
          data-design-id="deadman-config-btn"
          variant="ghost"
          size="sm"
          onClick={() => setConfigOpen(!configOpen)}
          className="h-7 text-xs text-[hsl(0_0%_45%)] hover:text-amber-400"
        >
          <Settings className="w-3 h-3 mr-1" /> Configure
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div data-design-id="deadman-countdown-section">
          <div data-design-id="deadman-countdown-display" className={`border ${statusBg} rounded-lg p-6 text-center mb-4 bg-[hsl(0_0%_3%)]`}>
            <div data-design-id="deadman-status-label" className={`text-xs font-bold uppercase tracking-wider mb-2 ${statusColor}`}>
              {status?.status === "active" ? "✓ ACTIVE" :
               status?.status === "grace" ? "⚠️ GRACE PERIOD" :
               status?.status === "expired" ? "🚨 EXPIRED — WILL EXECUTE" :
               "UNCONFIGURED"}
            </div>
            <div data-design-id="deadman-timer" className={`text-4xl font-bold ${statusColor} mb-1`}>
              {status ? formatTime(status.remaining) : "—:——"}
            </div>
            <div data-design-id="deadman-timer-label" className="text-[10px] text-[hsl(0_0%_40%)] mb-3">timeout remaining</div>
            <div data-design-id="deadman-grace-timer" className={`text-sm ${status?.status === "expired" ? "text-red-400" : "text-[hsl(0_0%_35%)]"}`}>
              + {status ? formatTime(status.graceRemaining) : "—:——"} grace
            </div>
            <div data-design-id="deadman-last-heartbeat" className="text-[9px] text-[hsl(0_0%_25%)] mt-3">
              Last heartbeat: {status?.lastHeartbeat ? new Date(status.lastHeartbeat).toLocaleString() : "never"}
            </div>
          </div>

          <Button
            data-design-id="deadman-heartbeat-btn"
            onClick={sendHeartbeat}
            disabled={heartbeatLoading}
            className="w-full h-12 text-sm font-bold bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
          >
            <Heart className={`w-5 h-5 mr-2 ${heartbeatLoading ? "animate-pulse" : ""}`} />
            {heartbeatLoading ? "SENDING..." : "❤️ SEND HEARTBEAT"}
          </Button>

          <Button
            data-design-id="deadman-test-btn"
            variant="outline"
            className="w-full mt-2 h-9 text-xs border-[hsl(0_0%_15%)] hover:border-amber-400/50 hover:text-amber-400"
          >
            <Play className="w-3 h-3 mr-1.5" /> Test Execute (Dry Run)
          </Button>
        </div>

        <div data-design-id="deadman-info-section">
          {configOpen ? (
            <motion.div
              data-design-id="deadman-config-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 mb-4"
            >
              <div>
                <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">Contract Address</label>
                <Input data-design-id="deadman-contract-input" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder="kaspatest:pr..." className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9" />
              </div>
              <div>
                <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">Beneficiary Address</label>
                <Input data-design-id="deadman-beneficiary-input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="kaspatest:..." className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">Timeout (seconds)</label>
                  <Input data-design-id="deadman-timeout-input" type="number" value={timeoutPeriod} onChange={(e) => setTimeoutPeriod(e.target.value)} className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider block mb-1">Grace (seconds)</label>
                  <Input data-design-id="deadman-grace-input" type="number" value={gracePeriod} onChange={(e) => setGracePeriod(e.target.value)} className="bg-[hsl(0_0%_3%)] border-[hsl(0_0%_10%)] text-xs h-9" />
                </div>
              </div>
              <Button data-design-id="deadman-save-btn" onClick={saveConfig} className="w-full h-9 text-xs bg-amber-400/10 border border-amber-400/50 text-amber-400 hover:bg-amber-400/20">
                Save Configuration
              </Button>
            </motion.div>
          ) : (
            <div data-design-id="deadman-status-info" className="space-y-3 mb-4">
              <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
                <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">Contract</div>
                <div data-design-id="deadman-contract-display" className="text-xs text-emerald-400 font-mono break-all">
                  {status?.contractAddress || "No contract linked"}
                </div>
              </div>
              <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
                <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">Beneficiary</div>
                <div data-design-id="deadman-beneficiary-display" className="text-xs text-cyan-400 font-mono break-all">
                  {status?.beneficiary || "No beneficiary configured"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 text-center">
                  <div className="text-[9px] text-[hsl(0_0%_40%)] mb-1">TIMEOUT</div>
                  <div data-design-id="deadman-timeout-display" className="text-sm font-bold text-amber-400">
                    <Clock className="w-3 h-3 inline mr-1" />{status?.timeoutPeriod || 0}s
                  </div>
                </div>
                <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 text-center">
                  <div className="text-[9px] text-[hsl(0_0%_40%)] mb-1">GRACE</div>
                  <div data-design-id="deadman-grace-display" className="text-sm font-bold text-amber-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />{status?.gracePeriod || 0}s
                  </div>
                </div>
              </div>
            </div>
          )}

          <div data-design-id="deadman-logs">
            <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">Activity Log</div>
            <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-32 overflow-y-auto text-[10px] font-mono">
              {logs.length === 0 ? (
                <div className="text-[hsl(0_0%_25%)]">Heartbeat activity will appear here...</div>
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