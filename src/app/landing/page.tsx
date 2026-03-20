"use client";

import { motion } from "framer-motion";
import {
  Zap, Shield, TrendingUp, Key, ArrowRight,
  Clock, CheckCircle, Globe, Cpu, Lock,
} from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Atomic Swaps",
    description: "Trustless KAS↔ETH swaps via HTLC contracts. No middleman, no custodian. 0.3-1% fee per swap.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/5",
    border: "border-emerald-400/20",
  },
  {
    icon: Shield,
    title: "Guardian Service",
    description: "Dead man's switch protection for your crypto. Automatic beneficiary transfers with heartbeat monitoring.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/5",
    border: "border-cyan-400/20",
  },
  {
    icon: TrendingUp,
    title: "Arbitrage Engine",
    description: "Autonomous price scanning across KuCoin, MEXC, CoinGecko. Detects and captures spread opportunities 24/7.",
    color: "text-amber-400",
    bg: "bg-amber-400/5",
    border: "border-amber-400/20",
  },
  {
    icon: Key,
    title: "Developer API",
    description: "Full REST API with rate-limited tiers. Build on Kaspa infrastructure without running your own node.",
    color: "text-purple-400",
    bg: "bg-purple-400/5",
    border: "border-purple-400/20",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["100 API calls/day", "1 deadman switch", "Basic swap access", "Community support"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Developer",
    price: "$20",
    period: "/month",
    features: ["10,000 API calls/day", "5 deadman switches", "Priority swap execution", "Webhook notifications", "Email support"],
    cta: "Start Building",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$100",
    period: "/month",
    features: ["Unlimited API calls", "Unlimited switches", "Arbitrage alerts", "Custom timeouts", "Priority support", "SDK access"],
    cta: "Go Pro",
    highlight: false,
  },
];

const STATS = [
  { label: "Uptime", value: "99.9%", icon: Clock },
  { label: "Swaps Processed", value: "1,200+", icon: Zap },
  { label: "Switches Active", value: "340+", icon: Shield },
  { label: "API Requests/Day", value: "50K+", icon: Globe },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[hsl(0_0%_2%)] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-400/[0.02] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-400/[0.02] blur-[100px]" />
      </div>

      <nav data-design-id="landing-nav" className="relative z-10 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div data-design-id="landing-nav-dot" className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span data-design-id="landing-nav-brand" className="text-sm font-bold tracking-wider text-emerald-400">KTN12</span>
          <span data-design-id="landing-nav-label" className="text-[10px] text-[hsl(0_0%_30%)]">AGENT</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" data-design-id="landing-nav-features" className="text-[11px] text-[hsl(0_0%_40%)] hover:text-white transition-colors">Features</a>
          <a href="#pricing" data-design-id="landing-nav-pricing" className="text-[11px] text-[hsl(0_0%_40%)] hover:text-white transition-colors">Pricing</a>
          <a href="/admin" data-design-id="landing-nav-admin" className="text-[11px] text-[hsl(0_0%_40%)] hover:text-white transition-colors">Admin</a>
          <a href="/" data-design-id="landing-nav-dashboard" className="px-3 py-1.5 text-[11px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 rounded hover:bg-emerald-400/20 transition-colors">
            Dashboard
          </a>
        </div>
      </nav>

      <section data-design-id="landing-hero" className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-32 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div data-design-id="landing-hero-badge" className="inline-block mb-6 px-3 py-1 text-[10px] border border-emerald-400/20 rounded-full text-emerald-400 bg-emerald-400/5">
            <Cpu size={10} className="inline mr-1" /> Autonomous Agent · Kaspa Testnet 12
          </div>
          <h1 data-design-id="landing-hero-title" className="text-4xl md:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            <span className="text-white">Trustless Crypto</span>
            <br />
            <span className="text-emerald-400 text-glow">Agent as a Service</span>
          </h1>
          <p data-design-id="landing-hero-subtitle" className="text-sm md:text-base text-[hsl(0_0%_45%)] max-w-xl mx-auto mb-8 leading-relaxed">
            Atomic swaps, dead man&apos;s switches, arbitrage scanning, and developer APIs — powered by an autonomous agent running 24/7 on Kaspa.
          </p>
          <div data-design-id="landing-hero-ctas" className="flex items-center justify-center gap-3">
            <a href="/" className="px-6 py-2.5 text-sm bg-emerald-400 text-black font-bold rounded hover:bg-emerald-300 transition-colors flex items-center gap-2">
              Launch Dashboard <ArrowRight size={14} />
            </a>
            <a href="#pricing" className="px-6 py-2.5 text-sm border border-[hsl(0_0%_15%)] text-[hsl(0_0%_60%)] rounded hover:border-[hsl(0_0%_25%)] hover:text-white transition-colors">
              View Pricing
            </a>
          </div>
        </motion.div>
      </section>

      <section data-design-id="landing-stats" className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              data-design-id={`landing-stat-${i}`}
              className="text-center p-4 bg-[hsl(0_0%_4%)] border border-[hsl(0_0%_8%)] rounded-lg"
            >
              <s.icon size={16} className="text-emerald-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-[hsl(0_0%_35%)]">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" data-design-id="landing-features" className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 data-design-id="landing-features-title" className="text-2xl md:text-3xl font-bold text-white mb-3">Four Revenue Engines</h2>
          <p data-design-id="landing-features-subtitle" className="text-sm text-[hsl(0_0%_40%)]">Each module generates income autonomously, 24/7</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              data-design-id={`landing-feature-${i}`}
              className={`p-6 ${f.bg} border ${f.border} rounded-lg hover:scale-[1.01] transition-transform`}
            >
              <f.icon size={20} className={f.color} />
              <h3 className={`text-lg font-bold ${f.color} mt-3 mb-2`}>{f.title}</h3>
              <p className="text-sm text-[hsl(0_0%_50%)] leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section data-design-id="landing-how" className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <h2 data-design-id="landing-how-title" className="text-2xl font-bold text-white text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Get API Key", desc: "Sign up and generate your API key instantly. Free tier available." },
            { step: "02", title: "Integrate", desc: "Use our REST API or Telegram bot to initiate swaps, configure switches, or scan prices." },
            { step: "03", title: "Earn", desc: "The agent runs 24/7 — collecting fees, monitoring switches, and capturing arbitrage." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * i }}
              data-design-id={`landing-how-step-${i}`}
              className="text-center"
            >
              <div className="text-3xl font-bold text-emerald-400/20 mb-2">{item.step}</div>
              <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
              <p className="text-xs text-[hsl(0_0%_40%)]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="pricing" data-design-id="landing-pricing" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <h2 data-design-id="landing-pricing-title" className="text-2xl md:text-3xl font-bold text-white text-center mb-3">Simple Pricing</h2>
        <p data-design-id="landing-pricing-subtitle" className="text-sm text-[hsl(0_0%_40%)] text-center mb-10">Start free, scale as you grow</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              data-design-id={`landing-pricing-${i}`}
              className={`p-6 rounded-lg border ${
                p.highlight
                  ? "bg-emerald-400/5 border-emerald-400/30 ring-1 ring-emerald-400/10"
                  : "bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"
              }`}
            >
              {p.highlight && (
                <span className="text-[9px] bg-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Popular</span>
              )}
              <h3 className="text-lg font-bold text-white mt-2">{p.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-white">{p.price}</span>
                <span className="text-sm text-[hsl(0_0%_40%)]">{p.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[hsl(0_0%_50%)]">
                    <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/admin"
                className={`block text-center py-2 text-xs rounded transition-colors ${
                  p.highlight
                    ? "bg-emerald-400 text-black font-bold hover:bg-emerald-300"
                    : "border border-[hsl(0_0%_15%)] text-[hsl(0_0%_50%)] hover:border-[hsl(0_0%_25%)] hover:text-white"
                }`}
              >
                {p.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      <section data-design-id="landing-security" className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="bg-[hsl(0_0%_4%)] border border-[hsl(0_0%_8%)] rounded-lg p-8 text-center">
          <Lock size={24} className="text-emerald-400 mx-auto mb-3" />
          <h2 data-design-id="landing-security-title" className="text-xl font-bold text-white mb-2">Enterprise-Grade Security</h2>
          <p data-design-id="landing-security-text" className="text-sm text-[hsl(0_0%_40%)] max-w-lg mx-auto">
            HTLC-based trustless swaps. No private key exposure. Rate limiting. Input validation. Audit logging on every transaction.
          </p>
        </div>
      </section>

      <footer data-design-id="landing-footer" className="relative z-10 border-t border-[hsl(0_0%_6%)] py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span data-design-id="landing-footer-brand" className="text-xs text-emerald-400 font-bold">KTN12 AGENT</span>
        </div>
        <p data-design-id="landing-footer-text" className="text-[10px] text-[hsl(0_0%_25%)]">
          Kaspa Testnet 12 · Autonomous Crypto Agent · Built for builders
        </p>
      </footer>
    </div>
  );
}