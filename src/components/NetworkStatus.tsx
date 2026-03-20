"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Blocks, Gauge, Network, Wifi } from "lucide-react";

interface NetworkInfo {
  blockCount: number;
  headerCount: number;
  difficulty: number;
  networkName: string;
  virtualDaaScore: number;
  error?: string;
}

export default function NetworkStatus() {
  const [info, setInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const resp = await fetch("/api/network/info");
        const data = await resp.json();
        setInfo(data);
      } catch {
        setInfo(null);
      }
    };
    fetchInfo();
    const interval = setInterval(fetchInfo, 8000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "BLOCKS", value: info?.blockCount?.toLocaleString() || "—", icon: Blocks, color: "text-emerald-400" },
    { label: "HEADERS", value: info?.headerCount?.toLocaleString() || "—", icon: Network, color: "text-cyan-400" },
    { label: "DAA SCORE", value: info?.virtualDaaScore?.toLocaleString() || "—", icon: Activity, color: "text-violet-400" },
    { label: "DIFFICULTY", value: info?.difficulty ? `${(info.difficulty / 1e12).toFixed(2)}T` : "—", icon: Gauge, color: "text-amber-400" },
  ];

  const synced = info ? info.blockCount === info.headerCount : false;

  return (
    <div data-design-id="network-status-container" className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          data-design-id={`network-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4 hover:border-[hsl(0_0%_15%)] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-widest text-[hsl(0_0%_45%)] uppercase">{stat.label}</span>
            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
          </div>
          <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
        </motion.div>
      ))}
      <motion.div
        data-design-id="network-sync-status"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="col-span-2 md:col-span-4 flex items-center gap-3 px-4 py-2 bg-[hsl(0_0%_4%)] border border-[hsl(0_0%_10%)] rounded-lg text-xs"
      >
        <div className={`w-2 h-2 rounded-full ${synced ? "bg-emerald-400 glow-pulse" : "bg-amber-400 animate-pulse"}`} />
        <span data-design-id="network-label" className="text-[hsl(0_0%_45%)]">NETWORK</span>
        <span data-design-id="network-name" className="text-emerald-400 font-bold">{info?.networkName || "TESTNET-12"}</span>
        <Wifi className="w-3 h-3 text-emerald-400 ml-auto" />
        <span data-design-id="network-sync-label" className={synced ? "text-emerald-400" : "text-amber-400"}>
          {info?.error ? "OFFLINE" : synced ? "SYNCED" : "SYNCING..."}
        </span>
      </motion.div>
    </div>
  );
}