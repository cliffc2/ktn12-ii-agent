kaspa-tn12-dashboard/package.json, kaspa-tn12-dashboard/src/components/AtomicSwapPanel.tsx, kaspa-tn12-dashboard/src/lib/kaspa-api.ts, kaspa-tn12-dashboard/src/lib/store.ts, kaspa-tn12-dashboard/src/lib/utils.ts, KTN12/atomic-swap/README.md, KTN12/atomic-swap/contracts/KaspaHTLC.sl, KTN12/atomic-swap/IMPLEMENTATION_NOTES.md
Let me read more of the existing codebase to understand the full picture before building the agent.
Let me read the remaining key files to understand the full existing infrastructure.
• Read kaspa-tn12-dashboard/src/app/page.tsx, kaspa-tn12-dashboard/src/app/layout.tsx, kaspa-tn12-dashboard/src/components/NetworkStatus.tsx, kaspa-tn12-dashboard/src/components/WalletCard.tsx, kaspa-tn12-dashboard/src/components/RPCTester.tsx
Let me read the existing API routes to understand the backend infrastructure, then I'll plan the agent build.
• List deeply kaspa-tn12-dashboard/src/app/api
Let me read the existing API routes and then plan the agent build.
• Read kaspa-tn12-dashboard/src/app/api/atomic-swap/initiate/route.ts, kaspa-tn12-dashboard/src/app/api/atomic-swap/intent/route.ts, kaspa-tn12-dashboard/src/app/api/rpc/route.ts, kaspa-tn12-dashboard/src/app/api/network/info/route.ts, kaspa-tn12-dashboard/src/app/api/wallet/balance/route.ts, kaspa-tn12-dashboard/src/app/api/atomic-swap/claim/route.ts, kaspa-tn12-dashboard/src/app/api/atomic-swap/list/route.ts, kaspa-tn12-dashboard/src/app/api/atomic-swap/refund/route.ts
Now I have a full picture of your codebase. Let me plan and build the arbitrage agent. Let me first think through the architecture.
Great architecture plan. Let me build this out now. This is a substantial implementation - let me track the steps.
☐  Create agent type definitions (types.ts)
☐  Create price feed system with real CoinGecko + simulated exchanges (price-feeds.ts)
☐  Create arbitrage opportunity detection engine (arbitrage.ts)
☐  Create risk manager (risk-manager.ts)
☐  Create portfolio/P&L tracker (portfolio.ts)
☐  Create trade executor (executor.ts)
☐  Create main agent engine singleton (engine.ts)
☐  Create API routes (start, stop, status, config, stream)
☐  Create AgentDashboard.tsx component
☐  Wire AgentDashboard into page.tsx
☐  Typecheck and review changes
Let me build this out. I'll create all the agent infrastructure files in parallel.
Let me check what files were created and then continue building the remaining pieces.
• Glob kaspa-tn12-dashboard/src/lib/agent/**/*.ts
Let me read the created files and then build the remaining pieces.
• Read kaspa-tn12-dashboard/src/lib/agent/types.ts, kaspa-tn12-dashboard/src/lib/agent/price-feeds.ts, kaspa-tn12-dashboard/src/lib/agent/arbitrage.ts, kaspa-tn12-dashboard/src/lib/agent/risk-manager.ts, kaspa-tn12-dashboard/src/lib/agent/portfolio.ts
✓  Create agent type definitions (types.ts)
✓  Create price feed system with real CoinGecko + simulated exchanges (price-feeds.ts)
✓  Create arbitrage opportunity detection engine (arbitrage.ts)
✓  Create risk manager (risk-manager.ts)
✓  Create portfolio/P&L tracker (portfolio.ts)
☐  Create trade executor (executor.ts)
☐  Create main agent engine singleton (engine.ts)
☐  Create API routes (start, stop, status, config, stream)
☐  Create AgentDashboard.tsx component
☐  Wire AgentDashboard into page.tsx
☐  Typecheck and review changes
Now let me create the executor, engine, API routes, and dashboard component. I'll build the backend files first, then the frontend.
• Create kaspa-tn12-dashboard/src/lib/agent/executor.ts
Now let me create the engine and API routes, then the dashboard component.
• Create kaspa-tn12-dashboard/src/lib/agent/engine.ts
Now let me create the API routes and the dashboard component. I'll create them in parallel using multiple agents.
Let me verify what was created and wire it into the main page.
• Glob kaspa-tn12-dashboard/src/app/api/agent/**/route.ts
Let me verify the created files and wire the dashboard into the main page.
• Read kaspa-tn12-dashboard/src/app/api/agent/start/route.ts, kaspa-tn12-dashboard/src/app/api/agent/status/route.ts, kaspa-tn12-dashboard/src/app/api/agent/stream/route.ts, kaspa-tn12-dashboard/src/components/AgentDashboard.tsx
Good, everything looks solid. Let me wire the dashboard into the main page and fix a small case-sensitivity issue in the portfolio display. Then I'll typecheck and review.
• Edit kaspa-tn12-dashboard/src/app/page.tsx
 import AtomicSwapPanel from "@/components/AtomicSwapPanel";
 import DeadmanSwitch from "@/components/DeadmanSwitch";
 import ContractPanel from "@/components/ContractPanel";
 import RPCTester from "@/components/RPCTester";
+import AgentDashboard from "@/components/AgentDashboard";
 
 export default function Home() {
   return (
     <div className="min-h-screen grid-bg relative overflow-hidden">
             />
           </div>
         </section>
 
+        <section data-design-id="agent-section" className="mb-6">
+          <div data-design-id="agent-section-header" className="text-[10px] text-[hsl(0_0%_35%)] uppercase tracking-widest mb-3">Arbitrage Agent</div>
+          <AgentDashboard />
+        </section>
+
         <section data-design-id="atomic-swap-section" className="mb-6">
           <div data-design-id="atomic-swap-section-header" className="text-[10px] text-[hsl(0_0%_35%)] uppercase tracking-widest mb-3">Atomic Swaps</div>
           <AtomicSwapPanel />
         </section>
Let me fix the case-sensitivity issue in the dashboard's portfolio balance lookup, then typecheck and review.
• Edit kaspa-tn12-dashboard/src/components/AgentDashboard.tsx
                 bgColor: "bg-cyan-400/5",
               },
             ] as const
           ).map((asset, i) => {
-            const bal = portfolio.balances[asset.symbol] ?? 0;
+            const bal = portfolio.balances[asset.symbol.toLowerCase()] ?? portfolio.balances[asset.symbol] ?? 0;
             return (
               <motion.div
                 key={asset.symbol}
                 initial={{ opacity: 0, y: 15 }}
Now let me typecheck and review the changes in parallel.
✓  Create agent type definitions (types.ts)
✓  Create price feed system with real CoinGecko + simulated exchanges (price-feeds.ts)
✓  Create arbitrage opportunity detection engine (arbitrage.ts)
✓  Create risk manager (risk-manager.ts)
✓  Create portfolio/P&L tracker (portfolio.ts)
✓  Create trade executor (executor.ts)
✓  Create main agent engine singleton (engine.ts)
✓  Create API routes (start, stop, status, config, stream)
✓  Create AgentDashboard.tsx component
✓  Wire AgentDashboard into page.tsx
☐  Typecheck and review changes
Good catches from both the typechecker and reviewer. Let me fix all the issues.
• Read kaspa-tn12-dashboard/src/app/api/agent/stream/route.ts, kaspa-tn12-dashboard/src/app/api/agent/stop/route.ts, kaspa-tn12-dashboard/src/app/api/agent/config/route.ts
Let me fix all the issues found by the typechecker and reviewer.
• Edit kaspa-tn12-dashboard/src/app/api/agent/stream/route.ts
 
 export async function GET() {
   try {
     const encoder = new TextEncoder();
-    const { readable, writable } = new TransformStream();
-    const writer = writable.getWriter();
 
-    let closed = false;
+    let unsubscribe: (() => void) | null = null;
 
-    const unsubscribe = subscribe((event) => {
-      if (closed) return;
-      try {
-        const data = JSON.stringify(event);
-        writer.write(encoder.encode(`data: ${data}\n\n`));
-      } catch {
-        /* stream may already be closed */
-      }
+    const stream = new ReadableStream({
+      start(controller) {
+        controller.enqueue(encoder.encode(": heartbeat\n\n"));
+
+        unsubscribe = subscribe((event) => {
+          try {
+            const data = JSON.stringify(event);
+            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
+          } catch {
+            /* stream may already be closed */
+          }
+        });
+      },
+      cancel() {
+        unsubscribe?.();
+      },
     });
 
-    // Send an initial heartbeat so the client knows the connection is alive
-    writer.write(encoder.encode(": heartbeat\n\n"));
-
-    // Clean up the subscription when the writable side closes
-    writable.closed
-      .then(() => {
-        closed = true;
-        unsubscribe();
-      })
-      .catch(() => {
-        closed = true;
-        unsubscribe();
-      });
-
-    return new Response(readable, {
+    return new Response(stream, {
       headers: {
         "Content-Type": "text/event-stream",
         "Cache-Control": "no-cache",
         Connection: "keep-alive",
Now let me fix the remaining issues from the code review.
• Edit kaspa-tn12-dashboard/src/lib/agent/executor.ts
 import crypto from "crypto";
-import type { AgentConfig, ArbitrageOpportunity, Trade } from "./types";
+import type { AgentConfig, ArbitrageOpportunity, Portfolio, Trade } from "./types";
 import { calculateTradeSize } from "./risk-manager";
-import type { Portfolio } from "./types";
 
 const SLIPPAGE_BASE_BPS = 5;
 
 function generateTradeId(): string {
Let me continue fixing all the remaining review issues.
• Edit kaspa-tn12-dashboard/src/lib/agent/engine.ts
 export function getAgentStatus(): AgentStatus {
   const portfolio = getPortfolio();
   const refPrice = getRealReferencePrice();
 
-  if (refPrice && portfolio.balances.kas) {
-    portfolio.totalValueKas =
-      portfolio.balances.kas +
-      (portfolio.balances.eth || 0) / (refPrice || 1) +
-      (portfolio.balances.usdt || 0) / (refPrice || 1);
+  if (refPrice) {
+    const kasUsd = refPrice;
+    const kasEthPrice = getLastKnownPrice("KAS/ETH");
+    const ethUsd = kasEthPrice && kasEthPrice > 0 ? kasUsd / kasEthPrice : 0;
     portfolio.totalValueUsd =
-      (portfolio.balances.kas || 0) * refPrice +
-      (portfolio.balances.eth || 0) * refPrice * 25000 +
+      (portfolio.balances.kas || 0) * kasUsd +
+      (portfolio.balances.eth || 0) * ethUsd +
       (portfolio.balances.usdt || 0);
+    portfolio.totalValueKas =
+      kasUsd > 0 ? portfolio.totalValueUsd / kasUsd : 0;
   }
 
   return {
     running,
• Edit kaspa-tn12-dashboard/src/lib/agent/engine.ts
 import type { AgentConfig, AgentEvent, AgentStatus, ArbitrageOpportunity } from "./types";
 import { DEFAULT_CONFIG } from "./types";
-import { fetchAllPriceFeeds, getRealReferencePrice } from "./price-feeds";
+import { fetchAllPriceFeeds, getRealReferencePrice, getLastKnownPrice } from "./price-feeds";
 import { detectOpportunities, rankOpportunities } from "./arbitrage";
 import { canTrade } from "./risk-manager";
 import { executeTrade } from "./executor";
 import {
Let me continue fixing the remaining review issues.
• Edit kaspa-tn12-dashboard/src/lib/agent/portfolio.ts
 // ---------------------------------------------------------------------------
 // Helpers
 // ---------------------------------------------------------------------------
 
-function todayKey(): string {
-  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
-}
-
 function startOfToday(): number {
   return new Date(new Date().setHours(0, 0, 0, 0)).getTime();
 }
Let me finish fixing the remaining review issues.
• Edit kaspa-tn12-dashboard/src/components/AgentDashboard.tsx
   TrendingDown,
   Activity,
   BarChart3,
   ArrowRightLeft,
-  Clock,
   Wallet,
   Terminal,
   Settings,
   ChevronDown,
   Save,
   RefreshCw,
   Zap,
   Shield,
-  AlertTriangle,
   CircleDot,
   Coins,
-  Gauge,
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 
     async (action: "start" | "stop") => {
       setActionLoading(true);
       addLog(`${action === "start" ? "Starting" : "Stopping"} agent...`, "info");
       try {
-        const resp = await fetch(`/api/agent/${action}`, { method: "POST" });
+        const resp = await fetch(`/api/agent/${action}`, {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: action === "start" ? JSON.stringify({ autoTrade }) : undefined,
+      });
         const data = await resp.json();
         if (data.error) {
           addLog(`Error: ${data.error}`, "error");
         } else {
 
           <div className="flex items-center gap-2">
             {/* Auto-trade toggle */}
             <button
-              onClick={() => setAutoTrade(!autoTrade)}
+              onClick={() => {
+                const next = !autoTrade;
+                setAutoTrade(next);
+                fetch("/api/agent/config", {
+                  method: "POST",
+                  headers: { "Content-Type": "application/json" },
+                  body: JSON.stringify({ enabled: next }),
+                }).catch(() => {});
+              }}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                 autoTrade
                   ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400"
                   : "bg-[hsl(0_0%_8%)] border-[hsl(0_0%_15%)] text-[hsl(0_0%_45%)]"
Let me fix the last review issue (dead check in risk-manager) and re-run the typecheck.
• Edit kaspa-tn12-dashboard/src/lib/agent/risk-manager.ts
       reason: `Confidence ${opportunity.confidence.toFixed(2)} is below threshold 0.3`,
     };
   }
 
-  // Check max trade size against estimated profit sizing
+  // Check sufficient balance for trade
   const tradeSize = calculateTradeSize(config, portfolio, opportunity);
-  if (tradeSize > config.maxTradeSize) {
+  if (tradeSize <= 0) {
     return {
       allowed: false,
-      reason: `Trade size ${tradeSize.toFixed(2)} exceeds max ${config.maxTradeSize}`,
+      reason: "Insufficient balance for trade",
     };
   }
 
   // Check daily loss limit — sum today's PnL from recent trades
Now let me re-run the typecheck to verify all fixes are clean.
✓  Create agent type definitions (types.ts)
✓  Create price feed system with real CoinGecko + simulated exchanges (price-feeds.ts)
✓  Create arbitrage opportunity detection engine (arbitrage.ts)
✓  Create risk manager (risk-manager.ts)
✓  Create portfolio/P&L tracker (portfolio.ts)
✓  Create trade executor (executor.ts)
✓  Create main agent engine singleton (engine.ts)
✓  Create API routes (start, stop, status, config, stream)
✓  Create AgentDashboard.tsx component
✓  Wire AgentDashboard into page.tsx
✓  Typecheck and review changes
All TypeScript errors are resolved. Here's a summary of everything that was built:
KTN12-II Arbitrage Agent — Complete Implementation
Agent Engine ( src/lib/agent/ ):
- types.ts — Full type system (AgentConfig, PriceFeed, ArbitrageOpportunity, Trade, Portfolio, AgentStatus, AgentEvent)
- price-feeds.ts — Real CoinGecko + Kaspa.org price feeds + 4 simulated exchanges (KaspaX, KoinSwap, IGRA-DEX, ZealousSwap) with random-walk mean-reversion and flash opportunity simulation
- arbitrage.ts — Cross-exchange/cross-chain opportunity detection with confidence scoring
- risk-manager.ts — Trade validation (daily loss limits, position caps, cooldowns, balance checks)
- portfolio.ts — Balance tracking, P&L calculation, win rate, daily history
- executor.ts — Simulated trade execution with realistic slippage and latency
- engine.ts — Autonomous tick loop with SSE event emitter, start/stop controls, config management
API Routes ( src/app/api/agent/ ):
-  start/  — Start agent with optional auto-trade
-  stop/  — Stop agent
-  status/  — Full status + P&L + portfolio + feeds
-  config/  — GET/POST agent configuration
-  stream/  — Real-time SSE event stream
Dashboard ( src/components/AgentDashboard.tsx ):
- Trading terminal UI with live price ticker, opportunity cards, trade history table, portfolio balances, agent log, and collapsible config panel with sliders — all matching the existing dark theme
[07:25 AM]
Let me start the dashboard so you can see it live. First, let me check if dependencies are installed.
Dependencies are installed. Let me start the dev server so you can see the dashboard.
The dev server is already running! Open your browser and go to:
http://localhost:3000
Scroll down past the Network Status and Wallet sections — you'll see the Arbitrage Agent panel with:
- Start/Stop controls and auto-trade toggle
- Live price feeds from CoinGecko + 4 simulated exchanges (KaspaX, KoinSwap, IGRA-DEX, ZealousSwap)
- Opportunity detection cards showing cross-exchange/cross-chain arb spreads
- Trade history table with P&L coloring
- Portfolio balances (KAS/ETH/USDT)
- Agent log terminal
- Collapsible config panel with sliders for tick interval, min profit, max trade size, etc.
Hit Start to fire up the agent — it'll begin scanning for arbitrage opportunities every 10 seconds.
Suggested followups:
[07:33 AM]
Let me gather context on the current agent implementation and research real Kaspa testnet-12 endpoints to integrate.
Let me gather context on the current implementation and available testnet infrastructure.
• Read kaspa-tn12-dashboard/src/lib/kaspa-api.ts, kaspa-tn12-dashboard/src/lib/agent/engine.ts, kaspa-tn12-dashboard/src/lib/agent/price-feeds.ts, kaspa-tn12-dashboard/src/lib/agent/executor.ts, kaspa-tn12-dashboard/src/lib/agent/types.ts, kaspa-tn12-dashboard/src/lib/agent/portfolio.ts