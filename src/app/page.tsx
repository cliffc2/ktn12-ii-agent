import NetworkStatus from "@/components/NetworkStatus";
import WalletCard from "@/components/WalletCard";
import AtomicSwapPanel from "@/components/AtomicSwapPanel";
import DeadmanSwitch from "@/components/DeadmanSwitch";
import ContractPanel from "@/components/ContractPanel";
import RPCTester from "@/components/RPCTester";

export default function Home() {
  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <header data-design-id="dashboard-header" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[hsl(0_0%_10%)]">
          <div data-design-id="header-logo" className="flex items-center gap-3">
            <div data-design-id="header-dot" className="w-2.5 h-2.5 bg-emerald-400 rounded-full glow-pulse" />
            <h1 data-design-id="header-title" className="text-lg font-bold tracking-wider text-glow text-emerald-400">
              KASPA TN12
            </h1>
            <span data-design-id="header-subtitle" className="text-xs text-[hsl(0_0%_40%)] tracking-wide">Dashboard</span>
          </div>
          <div data-design-id="header-badges" className="flex items-center gap-3 flex-wrap">
            <div data-design-id="header-version" className="px-3 py-1.5 bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded text-[10px]">
              <span className="text-[hsl(0_0%_40%)]">Kaspad </span>
              <span className="text-emerald-400 font-bold">v1.1.0</span>
            </div>
            <div data-design-id="header-network" className="px-3 py-1.5 bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded text-[10px]">
              <span className="text-[hsl(0_0%_40%)]">Network </span>
              <span className="text-cyan-400 font-bold">TESTNET 12</span>
              <span className="text-emerald-400 text-[8px] ml-1">(+Covenants)</span>
            </div>
            <div data-design-id="header-bps" className="px-3 py-1.5 bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded text-[10px]">
              <span className="text-[hsl(0_0%_40%)]">BPS </span>
              <span className="text-amber-400 font-bold">10</span>
            </div>
            <a href="/admin" data-design-id="header-admin-link" className="px-3 py-1.5 bg-amber-400/10 border border-amber-400/30 rounded text-[10px] text-amber-400 hover:bg-amber-400/20 transition-colors">
              Admin Panel
            </a>
            <a href="/landing" data-design-id="header-landing-link" className="px-3 py-1.5 bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded text-[10px] text-[hsl(0_0%_40%)] hover:text-white transition-colors">
              Landing Page
            </a>
          </div>
        </header>

        <section data-design-id="network-section" className="mb-6">
          <NetworkStatus />
        </section>

        <section data-design-id="wallets-section" className="mb-6">
          <div data-design-id="wallets-section-header" className="text-[10px] text-[hsl(0_0%_35%)] uppercase tracking-widest mb-3">Wallets</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <WalletCard
              id="a"
              title="Wallet A — Main Miner"
              defaultAddress="kaspatest:qp2ltc576eyy8hag0tckl9kqk62cvfz7p2egrlczyw9978zsh322jtnrx469r"
              delay={0.1}
            />
            <WalletCard
              id="b"
              title="Wallet B — Recipient"
              defaultAddress="kaspatest:qpx598t8l8l6g7ntq37fd9ecq7g2s90vk376tu28u4r7cnwf4nvmcruc3nd4d"
              delay={0.15}
            />
            <WalletCard
              id="c"
              title="Wallet C — Send From"
              delay={0.2}
            />
          </div>
        </section>

        <section data-design-id="atomic-swap-section" className="mb-6">
          <div data-design-id="atomic-swap-section-header" className="text-[10px] text-[hsl(0_0%_35%)] uppercase tracking-widest mb-3">Atomic Swaps</div>
          <AtomicSwapPanel />
        </section>

        <section data-design-id="deadman-section" className="mb-6">
          <div data-design-id="deadman-section-header" className="text-[10px] text-[hsl(0_0%_35%)] uppercase tracking-widest mb-3">Deadman Switch</div>
          <DeadmanSwitch />
        </section>

        <section data-design-id="contracts-section" className="mb-6">
          <div data-design-id="contracts-section-header" className="text-[10px] text-[hsl(0_0%_35%)] uppercase tracking-widest mb-3">Smart Contracts</div>
          <ContractPanel />
        </section>

        <section data-design-id="rpc-section" className="mb-6">
          <div data-design-id="rpc-section-header" className="text-[10px] text-[hsl(0_0%_35%)] uppercase tracking-widest mb-3">RPC Tester & Console</div>
          <RPCTester />
        </section>

        <footer data-design-id="dashboard-footer" className="py-4 border-t border-[hsl(0_0%_10%)] text-center text-[10px] text-[hsl(0_0%_25%)]">
          <span data-design-id="footer-text">KASPA TN12 Dashboard — Testnet 12 (Covenant) — v1.1.0</span>
          <span data-design-id="footer-links" className="mx-2">|</span>
          <span data-design-id="footer-ports" className="text-[hsl(0_0%_35%)]">gRPC:16210 wRPC:17210 P2P:16311</span>
        </footer>
      </div>
    </div>
  );
}
