"use client";

// Service Control Panel for KTN12 Dashboard
// Controls: Kaspad, IGRA Backend, IGRA Workers, Agent, Rothschild

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  CheckCircle,
  Loader2,
  Pickaxe,
  Play,
  Radio,
  RefreshCw,
  Server,
  Shield,
  Square,
  Terminal,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Service {
  name: string;
  key: string;
  icon: React.ReactNode;
  description: string;
  command: string;
  status: "unknown" | "running" | "stopped" | "loading";
  port?: string;
}

const SERVICES: Service[] = [
  {
    name: "Kaspad",
    key: "kaspad",
    icon: <Server className="w-3 h-3" />,
    description: "Kaspa full node daemon",
    command: "docker compose --profile kaspad up -d",
    status: "unknown",
    port: "16210",
  },
  {
    name: "IGRA Backend",
    key: "igra-backend",
    icon: <Radio className="w-3 h-3" />,
    description: "IGRA execution layer (Reth)",
    command: "docker compose --profile backend up -d",
    status: "unknown",
    port: "8545",
  },
  {
    name: "IGRA Workers",
    key: "igra-workers",
    icon: <Pickaxe className="w-3 h-3" />,
    description: "2 worker nodes + RPC providers",
    command: "docker compose --profile frontend-w2 up -d",
    status: "unknown",
    port: "8080",
  },
  {
    name: "Agent",
    key: "agent",
    icon: <Bot className="w-3 h-3" />,
    description: "Arbitrage trading agent",
    command: "curl -X POST http://localhost:3000/api/agent/start",
    status: "unknown",
  },
  {
    name: "Rothschild",
    key: "rothschild",
    icon: <Wallet className="w-3 h-3" />,
    description: "Multi-sig treasury vault",
    command: "KTN12/send-rothschild.js",
    status: "unknown",
  },
];

export default function ServiceControl() {
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, string>>({});

  const checkServiceStatus = useCallback(async () => {
    const currentServices = SERVICES;
    const updated = await Promise.all(
      currentServices.map(async (svc): Promise<Service> => {
        if (svc.key === "agent") {
          try {
            const resp = await fetch("/api/agent/status");
            const data = await resp.json();
            return { ...svc, status: data.running ? "running" : "stopped" };
          } catch {
            return { ...svc, status: "stopped" };
          }
        }

        if (svc.port) {
          try {
            const resp = await fetch(`http://localhost:${svc.port}`, {
              method: "HEAD",
            });
            return { ...svc, status: resp.ok ? "running" : "stopped" };
          } catch {
            return { ...svc, status: "stopped" };
          }
        }

        return svc;
      }),
    );
    setServices(updated);
  }, []);

  useEffect(() => {
    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 30000);
    return () => clearInterval(interval);
  }, [checkServiceStatus]);

  const startService = async (svc: Service) => {
    setLoading(svc.key);
    setLogs((prev) => ({ ...prev, [svc.key]: `Starting ${svc.name}...` }));

    try {
      if (svc.key === "agent") {
        await fetch("/api/agent/start", { method: "POST" });
      } else if (svc.key.startsWith("igra")) {
        await fetch("/api/services/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: svc.key }),
        });
      } else {
        setLogs((prev) => ({ ...prev, [svc.key]: `Execute: ${svc.command}` }));
      }

      setLogs((prev) => ({ ...prev, [svc.key]: `${svc.name} started` }));
      await checkServiceStatus();
    } catch (e) {
      setLogs((prev) => ({
        ...prev,
        [svc.key]: `Error: ${(e as Error).message}`,
      }));
    } finally {
      setLoading(null);
    }
  };

  const stopService = async (svc: Service) => {
    setLoading(svc.key);
    setLogs((prev) => ({ ...prev, [svc.key]: `Stopping ${svc.name}...` }));

    try {
      if (svc.key === "agent") {
        await fetch("/api/agent/stop", { method: "POST" });
      } else if (svc.key.startsWith("igra")) {
        await fetch("/api/services/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: svc.key }),
        });
      }

      setLogs((prev) => ({ ...prev, [svc.key]: `${svc.name} stopped` }));
      await checkServiceStatus();
    } catch (e) {
      setLogs((prev) => ({
        ...prev,
        [svc.key]: `Error: ${(e as Error).message}`,
      }));
    } finally {
      setLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "loading" || loading) {
      return <Loader2 className="w-3 h-3 animate-spin text-amber-400" />;
    }
    if (status === "running") {
      return <CheckCircle className="w-3 h-3 text-emerald-400" />;
    }
    if (status === "stopped") {
      return <XCircle className="w-3 h-3 text-red-400" />;
    }
    return <AlertCircle className="w-3 h-3 text-amber-400" />;
  };

  const runningCount = services.filter((s) => s.status === "running").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold tracking-wider text-cyan-400 uppercase">
            Services
          </h3>
          <span className="text-[9px] text-[hsl(0_0%_40%)]">
            ({runningCount}/{services.length} running)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkServiceStatus}
          className="h-6 text-[10px] text-[hsl(0_0%_45%)]"
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {services.map((svc) => (
          <div
            key={svc.key}
            className="bg-[hsl(0_0%_3%)] border border-[hsl(0_0%_10%)] rounded p-2"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                {svc.icon}
                <span className="text-[9px] font-bold">{svc.name}</span>
              </div>
              {getStatusIcon(svc.status)}
            </div>
            <div
              className="text-[7px] text-[hsl(0_0%_35%)] mb-2 truncate"
              title={svc.description}
            >
              {svc.description}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startService(svc)}
                disabled={loading === svc.key || svc.status === "running"}
                className="h-5 text-[8px] px-1.5 py-0 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20"
              >
                <Play className="w-2.5 h-2.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => stopService(svc)}
                disabled={loading === svc.key || svc.status === "stopped"}
                className="h-5 text-[8px] px-1.5 py-0 bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20"
              >
                <Square className="w-2.5 h-2.5" />
              </Button>
            </div>
            {logs[svc.key] && (
              <div className="text-[7px] text-[hsl(0_0%_40%)] mt-1 truncate">
                {logs[svc.key]}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[hsl(0_0%_10%)]">
        <div className="text-[8px] text-[hsl(0_0%_30%)]">
          <span className="font-mono">
            cd ~/igra-orchestra && docker compose --profile
            [kaspad|backend|frontend-w2] up -d
          </span>
        </div>
      </div>
    </motion.div>
  );
}
