"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Clock,
  Database,
  Download,
  Eye,
  Key,
  Power,
  PowerOff,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AdminStats {
  agent: {
    state: string;
    uptime: number;
    cycleCount: number;
    taskStats: { pending: number; completed: number; failed: number };
  };
  swaps: {
    total: number;
    active: number;
    claimed: number;
    totalFees: number;
    totalVolume: number;
  };
  guardian: {
    total: number;
    active: number;
    warning: number;
    grace: number;
    expired: number;
  };
  subscriptions: {
    totalMRR: number;
    totalActive: number;
    byTier: Record<string, number>;
  };
  arbitrage: {
    total: number;
    detected: number;
    completed: number;
    totalProfit: number;
    recentPrices: Array<{ exchange: string; price: number; timestamp: string }>;
  };
  gateway: { totalKeys: number; activeKeys: number; totalRequests: number };
  treasury: {
    totals: Record<string, number>;
    byType: Record<string, Record<string, number>>;
  };
  revenue: {
    total: number;
    swapFees: number;
    subscriptionMRR: number;
    arbitrageProfit: number;
  };
}

interface LogEntry {
  id: string;
  level: string;
  category: string;
  message: string;
  createdAt: string;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trend?: "up" | "down";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      data-design-id={`admin-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 hover:border-[hsl(0_0%_15%)] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`${color} opacity-60`}>
          <Icon size={16} />
        </span>
        {trend && (
          <span
            className={trend === "up" ? "text-emerald-400" : "text-red-400"}
          >
            {trend === "up" ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
          </span>
        )}
      </div>
      <div className="text-xl font-bold tracking-tight text-white">{value}</div>
      <div className="text-[10px] text-[hsl(0_0%_40%)] mt-0.5">{label}</div>
      {subValue && (
        <div className="text-[10px] text-[hsl(0_0%_30%)] mt-1">{subValue}</div>
      )}
    </motion.div>
  );
}

function AgentControls({
  stats,
  onRefresh,
}: { stats: AdminStats | null; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  const toggleAgent = async (action: "start" | "stop") => {
    setLoading(true);
    await fetch("/api/agent/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setTimeout(() => {
      onRefresh();
      setLoading(false);
    }, 500);
  };

  const agentState = stats?.agent?.state || "unknown";
  const isRunning = agentState !== "error";

  return (
    <div
      data-design-id="admin-agent-controls"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 glow-pulse" : "bg-red-400"}`}
          />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Agent Engine
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${agentState === "idle" ? "bg-emerald-400/10 text-emerald-400" : agentState === "scanning" ? "bg-cyan-400/10 text-cyan-400" : agentState === "executing" ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}
          >
            {agentState}
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => toggleAgent("start")}
            disabled={loading}
            className="px-2 py-1 text-[10px] bg-emerald-400/10 text-emerald-400 rounded hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
          >
            <Power size={12} />
          </button>
          <button
            type="button"
            onClick={() => toggleAgent("stop")}
            disabled={loading}
            className="px-2 py-1 text-[10px] bg-red-400/10 text-red-400 rounded hover:bg-red-400/20 transition-colors disabled:opacity-50"
          >
            <PowerOff size={12} />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="px-2 py-1 text-[10px] bg-[hsl(0_0%_10%)] text-[hsl(0_0%_50%)] rounded hover:bg-[hsl(0_0%_15%)] transition-colors"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-lg font-bold text-white">
            {formatUptime(stats?.agent?.uptime || 0)}
          </div>
          <div className="text-[9px] text-[hsl(0_0%_35%)]">UPTIME</div>
        </div>
        <div>
          <div className="text-lg font-bold text-cyan-400">
            {stats?.agent?.cycleCount || 0}
          </div>
          <div className="text-[9px] text-[hsl(0_0%_35%)]">CYCLES</div>
        </div>
        <div>
          <div className="text-lg font-bold text-emerald-400">
            {stats?.agent?.taskStats?.completed || 0}
          </div>
          <div className="text-[9px] text-[hsl(0_0%_35%)]">COMPLETED</div>
        </div>
        <div>
          <div className="text-lg font-bold text-red-400">
            {stats?.agent?.taskStats?.failed || 0}
          </div>
          <div className="text-[9px] text-[hsl(0_0%_35%)]">FAILED</div>
        </div>
      </div>
    </div>
  );
}

function RevenuePanel({ stats }: { stats: AdminStats | null }) {
  const rev = stats?.revenue;
  return (
    <div
      data-design-id="admin-revenue-panel"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-emerald-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Revenue
        </span>
      </div>
      <div className="text-3xl font-bold text-emerald-400 mb-3">
        ${(rev?.total || 0).toFixed(2)}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[hsl(0_0%_40%)]">Swap Fees</span>
          <span className="text-xs text-white font-mono">
            {(rev?.swapFees || 0).toFixed(4)} KAS
          </span>
        </div>
        <div className="w-full bg-[hsl(0_0%_8%)] rounded-full h-1">
          <div
            className="bg-emerald-400 h-1 rounded-full"
            style={{
              width: `${Math.min(100, ((rev?.swapFees || 0) / Math.max(rev?.total || 1, 1)) * 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[hsl(0_0%_40%)]">
            Subscriptions (MRR)
          </span>
          <span className="text-xs text-white font-mono">
            ${(rev?.subscriptionMRR || 0).toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-[hsl(0_0%_8%)] rounded-full h-1">
          <div
            className="bg-cyan-400 h-1 rounded-full"
            style={{
              width: `${Math.min(100, ((rev?.subscriptionMRR || 0) / Math.max(rev?.total || 1, 1)) * 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[hsl(0_0%_40%)]">
            Arbitrage Profit
          </span>
          <span className="text-xs text-white font-mono">
            ${(rev?.arbitrageProfit || 0).toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-[hsl(0_0%_8%)] rounded-full h-1">
          <div
            className="bg-amber-400 h-1 rounded-full"
            style={{
              width: `${Math.min(100, ((rev?.arbitrageProfit || 0) / Math.max(rev?.total || 1, 1)) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LiveFeed({ logs }: { logs: LogEntry[] }) {
  const levelColor: Record<string, string> = {
    info: "text-cyan-400",
    warn: "text-amber-400",
    error: "text-red-400",
    trade: "text-emerald-400",
    debug: "text-[hsl(0_0%_40%)]",
  };

  return (
    <div
      data-design-id="admin-live-feed"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-cyan-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Live Activity
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto font-mono text-[10px]">
        <AnimatePresence>
          {logs.map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2 py-0.5"
            >
              <span className="text-[hsl(0_0%_25%)] shrink-0">
                {new Date(l.createdAt).toLocaleTimeString()}
              </span>
              <span
                className={`shrink-0 uppercase w-10 ${levelColor[l.level] || "text-white"}`}
              >
                {l.level}
              </span>
              <span className="text-cyan-400/60 shrink-0 w-16">
                [{l.category}]
              </span>
              <span className="text-[hsl(0_0%_60%)] truncate">{l.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {logs.length === 0 && (
          <div className="text-[hsl(0_0%_25%)] text-center py-4">
            No activity yet...
          </div>
        )}
      </div>
    </div>
  );
}

function PricePanel({ stats }: { stats: AdminStats | null }) {
  const prices = stats?.arbitrage?.recentPrices || [];
  return (
    <div
      data-design-id="admin-price-panel"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={14} className="text-amber-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Live Prices
        </span>
      </div>
      <div className="space-y-2">
        {prices.map((p) => (
          <div
            key={`${p.exchange}-${p.timestamp}`}
            className="flex items-center justify-between py-1 border-b border-[hsl(0_0%_8%)] last:border-0"
          >
            <span className="text-[10px] text-[hsl(0_0%_50%)] uppercase">
              {p.exchange}
            </span>
            <span className="text-xs font-mono text-white">
              ${p.price.toFixed(6)}
            </span>
          </div>
        ))}
        {prices.length === 0 && (
          <div className="text-[10px] text-[hsl(0_0%_25%)] text-center py-2">
            Scanning for prices...
          </div>
        )}
      </div>
    </div>
  );
}

function TreasuryPanel({ stats }: { stats: AdminStats | null }) {
  const totals = stats?.treasury?.totals || {};

  return (
    <div
      data-design-id="admin-treasury-panel"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={14} className="text-emerald-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Treasury
        </span>
        <a
          href="/api/treasury/export"
          className="ml-auto text-[10px] text-[hsl(0_0%_40%)] hover:text-white flex items-center gap-1"
        >
          <Download size={10} /> CSV
        </a>
      </div>
      <div className="space-y-2">
        {Object.entries(totals).map(([currency, balance]) => (
          <div
            key={currency}
            className="flex items-center justify-between py-1.5 border-b border-[hsl(0_0%_8%)] last:border-0"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${currency === "KAS" ? "bg-emerald-400" : currency === "ETH" ? "bg-cyan-400" : "bg-amber-400"}`}
              />
              <span className="text-xs text-white font-bold">{currency}</span>
            </div>
            <span className="text-xs font-mono text-[hsl(0_0%_60%)]">
              {(balance as number).toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiKeyGenerator() {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("free");
  const [result, setResult] = useState<{
    apiKey: string;
    userId: string;
  } | null>(null);

  const generate = async () => {
    const res = await fetch("/api/gateway/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || undefined, tier }),
    });
    const data = await res.json();
    setResult(data);
  };

  return (
    <div
      data-design-id="admin-apikey-gen"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Key size={14} className="text-amber-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Generate API Key
        </span>
      </div>
      <div className="space-y-2">
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_12%)] rounded px-3 py-1.5 text-xs text-white placeholder:text-[hsl(0_0%_25%)] focus:border-amber-400/50 outline-none"
        />
        <div className="flex gap-2">
          {["free", "developer", "pro"].map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1 text-[10px] rounded transition-colors ${tier === t ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "bg-[hsl(0_0%_8%)] text-[hsl(0_0%_40%)] border border-[hsl(0_0%_12%)] hover:border-[hsl(0_0%_20%)]"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={generate}
          className="w-full py-1.5 text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/20 transition-colors"
        >
          Generate Key
        </button>
        {result && (
          <div className="bg-[hsl(0_0%_3%)] border border-emerald-400/20 rounded p-2 mt-2">
            <div className="text-[9px] text-emerald-400 mb-1">
              API Key Generated:
            </div>
            <div className="text-[10px] font-mono text-white break-all">
              {result.apiKey}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SwapOrderList() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    fetch("/api/atomic-swap/list?limit=20")
      .then((r) => r.json())
      .then((d) => setOrders(d.swaps || []));
  }, []);

  return (
    <div
      data-design-id="admin-swap-list"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">
        Recent Swap Orders
      </h3>
      <div className="space-y-1 font-mono text-[10px]">
        {orders.map((o) => (
          <div
            key={o.id as string}
            className="flex items-center gap-3 py-1 border-b border-[hsl(0_0%_8%)] last:border-0"
          >
            <span
              className={`w-14 ${o.status === "claimed" ? "text-emerald-400" : o.status === "initiated" ? "text-cyan-400" : "text-red-400"}`}
            >
              {o.status as string}
            </span>
            <span className="text-amber-400">{o.direction as string}</span>
            <span className="text-white">
              {(o.amount as number)?.toFixed(4)}
            </span>
            <span className="text-[hsl(0_0%_30%)]">
              fee: {(o.fee as number)?.toFixed(6)}
            </span>
            <span className="text-[hsl(0_0%_20%)] ml-auto truncate max-w-[150px]">
              {o.id as string}
            </span>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-[hsl(0_0%_25%)] text-center py-3">
            No swaps yet
          </div>
        )}
      </div>
    </div>
  );
}

function SwitchList() {
  const [switches, setSwitches] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    fetch("/api/guardian/switches")
      .then((r) => r.json())
      .then((d) => setSwitches(d.switches || []));
  }, []);

  return (
    <div
      data-design-id="admin-switch-list"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">
        Active Switches
      </h3>
      <div className="space-y-1 font-mono text-[10px]">
        {switches.map((s) => (
          <div
            key={s.id as string}
            className="flex items-center gap-3 py-1 border-b border-[hsl(0_0%_8%)] last:border-0"
          >
            <span
              className={`w-12 ${s.status === "active" ? "text-emerald-400" : s.status === "warning" ? "text-amber-400" : "text-red-400"}`}
            >
              {s.status as string}
            </span>
            <span className="text-white truncate max-w-[200px]">
              {s.owner as string}
            </span>
            <span className="text-[hsl(0_0%_30%)]">→</span>
            <span className="text-cyan-400 truncate max-w-[200px]">
              {s.beneficiary as string}
            </span>
            <span className="text-amber-400 ml-auto">
              {s.remaining as number}s
            </span>
          </div>
        ))}
        {switches.length === 0 && (
          <div className="text-[hsl(0_0%_25%)] text-center py-3">
            No switches configured
          </div>
        )}
      </div>
    </div>
  );
}

function ArbitragePanel() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    prices: Array<Record<string, unknown>>;
    opportunities: Array<Record<string, unknown>>;
  } | null>(null);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/arbitrage/scan", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      /* ignore */
    }
    setScanning(false);
  };

  return (
    <div
      data-design-id="admin-arb-panel"
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Arbitrage Scanner
        </h3>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          className="px-3 py-1 text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/20 transition-colors disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Run Scan"}
        </button>
      </div>
      {result && (
        <div className="space-y-3">
          <div>
            <div className="text-[9px] text-[hsl(0_0%_35%)] uppercase mb-1">
              Prices Found
            </div>
            {result.prices.map((p) => (
              <div
                key={p.exchange as string}
                className="flex justify-between text-xs py-0.5"
              >
                <span className="text-[hsl(0_0%_50%)]">
                  {p.exchange as string}
                </span>
                <span className="font-mono text-white">
                  ${(p.price as number)?.toFixed(6)}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[9px] text-[hsl(0_0%_35%)] uppercase mb-1">
              Opportunities
            </div>
            {result.opportunities.length > 0 ? (
              result.opportunities.map((o, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs py-0.5 text-emerald-400"
                >
                  <span>
                    Buy {o.buy as string} → Sell {o.sell as string}
                  </span>
                  <span className="font-mono">
                    {o.spread as number}% spread · ${o.profit as number} profit
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-[hsl(0_0%_30%)]">
                No opportunities above threshold
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<
    "overview" | "swaps" | "guardian" | "arbitrage" | "gateway" | "treasury"
  >("overview");

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/agent/logs?limit=50"),
      ]);
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();
      setStats(statsData);
      setLogs(logsData.logs || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Eye },
    { id: "swaps" as const, label: "Swaps", icon: Zap },
    { id: "guardian" as const, label: "Guardian", icon: Shield },
    { id: "arbitrage" as const, label: "Arbitrage", icon: TrendingUp },
    { id: "gateway" as const, label: "API Gateway", icon: Key },
    { id: "treasury" as const, label: "Treasury", icon: Wallet },
  ];

  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <header
          data-design-id="admin-header"
          className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(0_0%_10%)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-amber-400 rounded-full glow-pulse" />
            <h1
              data-design-id="admin-title"
              className="text-lg font-bold tracking-wider text-amber-400"
            >
              KTN12 AGENT
            </h1>
            <span className="text-[10px] text-[hsl(0_0%_30%)] bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] px-2 py-0.5 rounded">
              Admin Control Panel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              data-design-id="admin-back-link"
              className="text-[10px] text-[hsl(0_0%_40%)] hover:text-white flex items-center gap-1 transition-colors"
            >
              Dashboard <ChevronRight size={10} />
            </a>
          </div>
        </header>

        <nav
          data-design-id="admin-tabs"
          className="flex gap-1 mb-6 overflow-x-auto pb-1"
        >
          {tabs.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              data-design-id={`admin-tab-${t.id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded transition-all whitespace-nowrap ${
                tab === t.id
                  ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                  : "text-[hsl(0_0%_40%)] border border-transparent hover:text-white hover:bg-[hsl(0_0%_8%)]"
              }`}
            >
              <t.icon size={12} />
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <div className="space-y-4">
            <AgentControls stats={stats} onRefresh={fetchData} />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard
                icon={Zap}
                label="Total Swaps"
                value={stats?.swaps?.total || 0}
                subValue={`${stats?.swaps?.active || 0} active`}
                color="text-emerald-400"
                trend="up"
              />
              <StatCard
                icon={Shield}
                label="Active Switches"
                value={stats?.guardian?.active || 0}
                subValue={`${stats?.guardian?.warning || 0} warnings`}
                color="text-cyan-400"
              />
              <StatCard
                icon={TrendingUp}
                label="Arb Trades"
                value={stats?.arbitrage?.total || 0}
                subValue={`$${(stats?.arbitrage?.totalProfit || 0).toFixed(2)} profit`}
                color="text-amber-400"
                trend="up"
              />
              <StatCard
                icon={Key}
                label="API Keys"
                value={stats?.gateway?.activeKeys || 0}
                subValue={`${stats?.gateway?.totalRequests || 0} requests`}
                color="text-purple-400"
              />
              <StatCard
                icon={Users}
                label="Subscribers"
                value={stats?.subscriptions?.totalActive || 0}
                subValue={`$${(stats?.subscriptions?.totalMRR || 0).toFixed(0)}/mo`}
                color="text-pink-400"
              />
              <StatCard
                icon={Database}
                label="Tasks Queued"
                value={stats?.agent?.taskStats?.pending || 0}
                subValue={`${stats?.agent?.taskStats?.completed || 0} done`}
                color="text-orange-400"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RevenuePanel stats={stats} />
              <LiveFeed logs={logs} />
              <div className="space-y-4">
                <PricePanel stats={stats} />
                <TreasuryPanel stats={stats} />
              </div>
            </div>
          </div>
        )}

        {tab === "swaps" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard
                icon={Zap}
                label="Total"
                value={stats?.swaps?.total || 0}
                color="text-emerald-400"
              />
              <StatCard
                icon={Activity}
                label="Active"
                value={stats?.swaps?.active || 0}
                color="text-cyan-400"
              />
              <StatCard
                icon={ArrowUpRight}
                label="Claimed"
                value={stats?.swaps?.claimed || 0}
                color="text-emerald-400"
              />
              <StatCard
                icon={Wallet}
                label="Volume"
                value={`${(stats?.swaps?.totalVolume || 0).toFixed(2)}`}
                subValue="KAS"
                color="text-amber-400"
              />
              <StatCard
                icon={TrendingUp}
                label="Fees Earned"
                value={`${(stats?.swaps?.totalFees || 0).toFixed(4)}`}
                subValue="KAS"
                color="text-emerald-400"
                trend="up"
              />
            </div>
            <SwapOrderList />
          </div>
        )}

        {tab === "guardian" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard
                icon={Shield}
                label="Total"
                value={stats?.guardian?.total || 0}
                color="text-cyan-400"
              />
              <StatCard
                icon={Activity}
                label="Active"
                value={stats?.guardian?.active || 0}
                color="text-emerald-400"
              />
              <StatCard
                icon={AlertTriangle}
                label="Warning"
                value={stats?.guardian?.warning || 0}
                color="text-amber-400"
              />
              <StatCard
                icon={Clock}
                label="Grace"
                value={stats?.guardian?.grace || 0}
                color="text-orange-400"
              />
              <StatCard
                icon={PowerOff}
                label="Expired"
                value={stats?.guardian?.expired || 0}
                color="text-red-400"
              />
            </div>
            <SwitchList />
          </div>
        )}

        {tab === "arbitrage" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={TrendingUp}
                label="Opportunities"
                value={stats?.arbitrage?.detected || 0}
                color="text-amber-400"
              />
              <StatCard
                icon={Zap}
                label="Executed"
                value={stats?.arbitrage?.completed || 0}
                color="text-emerald-400"
              />
              <StatCard
                icon={Wallet}
                label="Total Profit"
                value={`$${(stats?.arbitrage?.totalProfit || 0).toFixed(2)}`}
                color="text-emerald-400"
                trend="up"
              />
              <StatCard
                icon={BarChart3}
                label="Total Scans"
                value={stats?.arbitrage?.total || 0}
                color="text-cyan-400"
              />
            </div>
            <ArbitragePanel />
          </div>
        )}

        {tab === "gateway" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                icon={Key}
                label="Total Keys"
                value={stats?.gateway?.totalKeys || 0}
                color="text-amber-400"
              />
              <StatCard
                icon={Activity}
                label="Active Keys"
                value={stats?.gateway?.activeKeys || 0}
                color="text-emerald-400"
              />
              <StatCard
                icon={BarChart3}
                label="Total Requests"
                value={stats?.gateway?.totalRequests || 0}
                color="text-cyan-400"
              />
            </div>
            <ApiKeyGenerator />
          </div>
        )}

        {tab === "treasury" && (
          <div className="space-y-4">
            <TreasuryPanel stats={stats} />
            <div className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4">
              <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">
                By Wallet Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(stats?.treasury?.byType || {}).map(
                  ([type, currencies]) => (
                    <div
                      key={type}
                      className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_8%)] rounded p-3"
                    >
                      <div className="text-[10px] text-[hsl(0_0%_40%)] uppercase tracking-wider mb-2">
                        {type === "hot"
                          ? "Hot Wallet"
                          : type === "cold"
                            ? "Cold Storage"
                            : "Fee Collection"}
                      </div>
                      {Object.entries(currencies as Record<string, number>).map(
                        ([curr, bal]) => (
                          <div
                            key={curr}
                            className="flex justify-between text-xs py-0.5"
                          >
                            <span className="text-[hsl(0_0%_50%)]">{curr}</span>
                            <span className="font-mono text-white">
                              {(bal as number).toFixed(4)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
