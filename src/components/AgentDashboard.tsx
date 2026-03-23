"use client";

import { Button } from "@/components/ui/button";
import type { AgentConfig, AgentStatus } from "@/lib/agent/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  Clock,
  RefreshCw,
  Save,
  Settings,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function AgentDashboard() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const eventSource = new EventSource("/api/agent/stream");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStatus(data);
        } catch {
          console.warn("Failed to parse event");
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch("/api/agent/status");
      const data = await resp.json();
      setStatus(data);
      if (!config) {
        const configResp = await fetch("/api/agent/config");
        const configData = await configResp.json();
        setConfig(configData);
      }
    } catch {
      console.warn("Failed to fetch status");
    }
  }, [config]);

  const handleAction = useCallback(
    async (action: "start" | "stop") => {
      setActionLoading(true);
      try {
        const resp = await fetch(`/api/agent/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "start" ? JSON.stringify({ autoTrade }) : undefined,
        });
        const data = await resp.json();
        if (action === "start") setAutoTrade(true);
        if (action === "stop") setAutoTrade(false);
      } catch (e) {
        console.error((e as Error).message);
      } finally {
        setActionLoading(false);
      }
    },
    [autoTrade],
  );

  const updateConfigValue = useCallback(
    async (field: string, value: number) => {
      if (!config) return;
      try {
        const resp = await fetch("/api/agent/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        const data = await resp.json();
        if (data.config) setConfig(data.config);
      } catch (e) {
        console.error((e as Error).message);
      }
    },
    [config],
  );

  if (!status) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-5"
      >
        <div className="text-center py-8">
          <p className="text-[hsl(0_0%_40%)]">Loading agent status...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">
            Arbitrage Agent
          </h2>
          <span className="text-[10px] text-[hsl(0_0%_35%)] ml-2">
            MEV-Resistant
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          className="h-7 text-xs text-[hsl(0_0%_45%)]"
        >
          <Settings className="w-3 h-3 mr-1" /> Config
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
          <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
            Status
          </div>
          <div className="text-[14px] font-bold">
            {status.running ? (
              <span className="text-emerald-400">Running</span>
            ) : (
              <span className="text-red-400">Stopped</span>
            )}
          </div>
          <div className="text-[10px] text-[hsl(0_0%_40%)] mt-1">
            {Math.floor(status.uptime / 1000)}s | Ticks: {status.tickCount}
          </div>
        </div>
        <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
          <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
            P&L
          </div>
          <div className="text-[14px] font-bold">
            {status.totalPnl >= 0 ? (
              <span className="text-emerald-400">
                +${status.totalPnl.toFixed(2)}
              </span>
            ) : (
              <span className="text-red-400">
                ${status.totalPnl.toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-[10px] text-[hsl(0_0%_40%)] mt-1">
            Daily:{" "}
            {status.dailyPnl >= 0
              ? `+$${status.dailyPnl.toFixed(2)}`
              : `$${status.dailyPnl.toFixed(2)}`}
          </div>
        </div>
        <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
          <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
            Trades
          </div>
          <div className="text-[14px] font-bold text-cyan-400">
            {status.totalTrades}
          </div>
          <div className="text-[10px] text-[hsl(0_0%_40%)] mt-1">
            Win Rate: {status.winRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
          <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-2">
            Balance
          </div>
          <div className="text-[14px] font-bold">
            ${status.portfolio.totalValueUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-[hsl(0_0%_40%)] mt-1">
            {status.portfolio.totalValueKas.toFixed(2)} KAS
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider">
            Price Feeds
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            className="h-7 text-xs text-[hsl(0_0%_45%)]"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
        <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[hsl(0_0%_2%)]">
                <th className="px-3 py-2 text-left text-[9px] text-[hsl(0_0%_30%)]">
                  Exchange
                </th>
                <th className="px-3 py-2 text-left text-[9px] text-[hsl(0_0%_30%)]">
                  Pair
                </th>
                <th className="px-3 py-2 text-left text-[9px] text-[hsl(0_0%_30%)]">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {status.priceFeeds.slice(0, 8).map((feed, i) => (
                <tr key={i} className="hover:bg-[hsl(0_0%_3%)]">
                  <td className="px-3 py-2 text-[9px] font-mono">
                    {feed.source}
                  </td>
                  <td className="px-3 py-2 text-[9px] font-mono">
                    {feed.pair}
                  </td>
                  <td className="px-3 py-2 text-[9px] font-mono">
                    ${feed.ask.toFixed(6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">
          Opportunities
        </div>
        <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg">
          {status.activeOpportunities.map((opp, i) => (
            <div
              key={i}
              className="p-3 border-b border-[hsl(0_0%_8%)] last:border-0"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono">{opp.pair}</span>
                <span
                  className={`text-[8px] px-2 rounded ${opp.spreadBps > 15 ? "bg-emerald-400/20 text-emerald-400" : "bg-amber-400/20 text-amber-400"}`}
                >
                  +{opp.spreadBps.toFixed(1)} bps
                </span>
              </div>
              <div className="text-[9px] font-mono text-[hsl(0_0%_40%)]">
                {opp.buySource} @ ${opp.buyPrice.toFixed(6)} → {opp.sellSource}{" "}
                @ ${opp.sellPrice.toFixed(6)}
              </div>
            </div>
          ))}
          {status.activeOpportunities.length === 0 && (
            <div className="p-4 text-center text-[hsl(0_0%_30%)]">
              No opportunities detected
            </div>
          )}
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">
          Trade History
        </div>
        <div className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg h-40 overflow-y-auto">
          {status.recentTrades.map((trade, i) => (
            <div
              key={i}
              className="p-3 border-b border-[hsl(0_0%_8%)] last:border-0"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono ${trade.status === "filled" && trade.pnl > 0 ? "text-emerald-400" : "text-[hsl(0_0%_40%)]"}`}
                >
                  {trade.pair} {trade.amount.toFixed(4)}
                </span>
                <span className="text-[9px] font-mono">
                  {trade.pnl >= 0
                    ? `+$${trade.pnl.toFixed(2)}`
                    : `$${trade.pnl.toFixed(2)}`}
                </span>
              </div>
            </div>
          ))}
          {status.recentTrades.length === 0 && (
            <div className="p-4 text-center text-[hsl(0_0%_30%)]">
              No trades yet
            </div>
          )}
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">
          Errors
        </div>
        <div className="bg-[hsl(0_0%_2%)] border border-[hsl(0_0%_10%)] rounded-lg p-3 h-32 overflow-y-auto text-[10px] font-mono">
          {status.errors.length === 0 ? (
            <div className="text-[hsl(0_0%_25%)]">No errors</div>
          ) : (
            status.errors.map((err, i) => (
              <div key={i} className="mb-1 text-red-400">
                {err}
              </div>
            ))
          )}
        </div>
      </div>

      {showConfig && config && (
        <div className="mb-5 p-4 bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded-lg">
          <div className="text-[10px] text-[hsl(0_0%_45%)] uppercase tracking-wider mb-3">
            Configuration
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[9px] text-[hsl(0_0%_40%)]">
                Tick Interval: {config.tickIntervalMs}ms
              </div>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={config.tickIntervalMs}
                onChange={(e) =>
                  updateConfigValue("tickIntervalMs", Number(e.target.value))
                }
                className="w-full"
              />
            </div>
            <div>
              <div className="text-[9px] text-[hsl(0_0%_40%)]">
                Min Profit: {config.minProfitBps} bps
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={config.minProfitBps}
                onChange={(e) =>
                  updateConfigValue("minProfitBps", Number(e.target.value))
                }
                className="w-full"
              />
            </div>
            <div>
              <div className="text-[9px] text-[hsl(0_0%_40%)]">
                Max Trade Size: ${config.maxTradeSize}
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={config.maxTradeSize}
                onChange={(e) =>
                  updateConfigValue("maxTradeSize", Number(e.target.value))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-[hsl(0_0%_10%)]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[hsl(0_0%_40%)]">
            Agent v1.0.0 • {status.running ? "Online" : "Offline"}
          </span>
          <Button
            onClick={() => handleAction(status.running ? "stop" : "start")}
            disabled={actionLoading}
            className={`h-8 text-xs font-bold ${status.running ? "bg-red-400/10 border border-red-400/50 text-red-400" : "bg-emerald-400/10 border border-emerald-400/50 text-emerald-400"}`}
          >
            {status.running ? (
              <>
                <Clock className="w-3 h-3 mr-1" /> Stop
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 mr-1" /> Start
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
