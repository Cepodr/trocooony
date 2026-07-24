export type KbSection = { id: string; title: string; summary: string; points: string[] }

export const RIALO_KB: KbSection[] = [
  {
    id: "overview", title: "What is Rialo",
    summary: "Rialo is a developer-first Layer 1 blockchain by Subzero Labs, built to give Web3 apps a Web2-like experience — fast, responsive, and connected to the real world. Tagline: 'Rethink. Rebuild. Rialo.'",
    points: [
      "Positioned as 'infrastructure for the next generation of intelligent systems' — often called a 'Real World Chain'.",
      "Makes real-world connectivity native to the protocol, aiming to render oracles, bridges, indexers, and keepers obsolete.",
      "Targets internet-scale apps: AI agents, prediction markets, and real-time onchain markets.",
      "Combines Web2-level UX (speed, usability, low cost) with Web3 decentralization and built-in privacy.",
    ],
  },
  {
    id: "vm", title: "Rialo VM & REX (execution)",
    summary: "Rialo's VM is based on the RISC-V instruction set and is compatible with the Solana VM (SVM), so developers can reuse existing Solana programs. EVM and MoveVM support are planned.",
    points: [
      "Rialo VM: RISC-V based, SVM-compatible (EVM & MoveVM soon), and ZK-friendly.",
      "REX (Rialo Extended Execution Runtime) enables Confidential Computing via TEEs.",
      "Execution Engine is event-driven with Conditional Transactions and Hybrid Concurrency Control for dynamic real-world workloads.",
      "Design targets (Dev Portal benchmarks): sub-second finality, very high execution TPS, near-instant reaction time.",
    ],
  },
  {
    id: "web", title: "Native Web Connectivity (webcalls)",
    summary: "Smart contracts on Rialo can talk directly to the internet (HTTPS / Web2 APIs) without external oracles or bridges.",
    points: [
      "Native webcalls let contracts fetch live data (prices, weather, feeds) and call external services directly.",
      "Enables native communication with AI agents, including protocols like Google's Agent2Agent (A2A).",
      "Removes multi-hop overhead, bridging scripts, and external watchers — fewer trust assumptions, consistent security.",
      "Can securely store and use credentials (e.g. API keys) without exposing them.",
    ],
  },
  {
    id: "reactive", title: "Reactive Transactions (native automation)",
    summary: "Also called conditional transactions: logic that executes automatically when a predicate becomes true, validated by the chain itself. No bots, keepers, or cron jobs.",
    points: [
      "Predicates can be time-based ('every 10 blocks'), value-based ('when balance > $1000'), or data-driven ('when BTC < $95K').",
      "Supports long-running programs across many blocks — able to suspend, wait, and resume on future conditions.",
      "A conditional transaction can spawn more conditional transactions, enabling multi-step workflows lasting hours or days.",
      "Flow: deploy predicate -> chain evaluates each block -> when matched, auto-execute. Trustless, no privileged operators.",
    ],
  },
  {
    id: "stream", title: "Rialo Stream (native data feeds)",
    summary: "Native real-time data feeds for DeFi, RWAs, and more — advertised as over 40x faster than top oracles.",
    points: [
      "Sub-100ms latency data with 100k+ tickers/second in Rialo's demos.",
      "Powers real-time onchain markets with no middleware or oracles.",
    ],
  },
  {
    id: "ipc", title: "Rialo IPC (Identity, Privacy, Compliance)",
    summary: "Identity, privacy, and compliance are first-class native capabilities rather than app-layer add-ons.",
    points: [
      "Privacy is native — not outsourced to the application layer.",
      "Balances privacy with the verifiability needed for compliance.",
      "Seed-phrase-free identity reduces the key-management burden that causes permanent loss of funds.",
    ],
  },
  {
    id: "cruise", title: "Rialo Cruise (gasless)",
    summary: "Native gasless transactions with low-to-zero fees, so apps can feel free to end users.",
    points: [
      "Removes gas friction for everyday users.",
      "Enables consumer-grade UX for onchain apps.",
    ],
  },
  {
    id: "omni", title: "Rialo Omni Account",
    summary: "One account that transacts across multiple networks.",
    points: [
      "A single account usable across chains, with easy and safe interoperability.",
    ],
  },
  {
    id: "scale", title: "Product — SCALE (agent labor)",
    summary: "SCALE = Simple Contracts for Agent Labor Execution. Inspired by the YC SAFE note, it sets simple, enforceable terms for paying AI agents to do work.",
    points: [
      "Uses on-chain logic to enforce task deadlines and quality assurance, refunding on late or low-quality delivery.",
      "Built on Rialo's native webcalls (talk to agents / A2A), native timers (auto-enforce deadlines), and fast payments.",
      "Addresses the same risk as hiring a human contractor who delivers late or below your quality bar.",
      "This is exactly the model Trocooony implements: mint -> escrow -> dispatch -> deliver -> judge -> settle.",
    ],
  },
  {
    id: "harness", title: "Product — Agentic Edge Harness & Gateway Marketplace",
    summary: "Trustless guard-rails for autonomous agent execution at scale, plus an open marketplace for agent services (gateways).",
    points: [
      "Gateways are services (payments, automation, web access, compute, confidential compute) shipped by third parties.",
      "Publish a service, meter usage, get paid in RLO, and build reputation from verifiable on-chain outcomes.",
      "Users can earn by evaluating gateways; gateways can be owned by DAOs.",
      "Aims at a machine-to-machine economy with billions of autonomous transactions per day.",
    ],
  },
  {
    id: "rlo", title: "RLO token",
    summary: "RLO is Rialo's native token used to pay for gateway usage, agent tasks, and rewards.",
    points: [
      "Gateway providers and evaluators earn RLO; reputation is built from verifiable outcomes.",
    ],
  },
  {
    id: "devtools", title: "Developer tooling",
    summary: "Rialo offers a Rust-based toolkit plus a browser playground and learning resources.",
    points: [
      "rialo-cdk (Rust) — the primary library for building Rialo apps.",
      "rialo-rex-evm — drive transactions on EVM chains from Rialo programs via REX WASM inside a TEE.",
      "rialo-venus-dsl — the rialo! macro generates Solana program interfaces from high-level workflow definitions.",
      "Playground (playground.rialo.io), Learn (learn.rialo.io), Docs (rialo.io/docs), Dev Portal (rialo.io/for-devs), GitHub (github.com/rialo).",
    ],
  },
  {
    id: "ecosystem", title: "Ecosystem & backers",
    summary: "Subzero Labs raised a $20M seed (Aug 2025) led by Pantera Capital, with a team drawn from top tech and crypto organizations.",
    points: [
      "Investors include Pantera Capital, Coinbase, Susquehanna, Edge Capital, Mirana, Mysten Labs, and Hashed.",
      "Contributors come from Meta, Netflix, Google, Apple, Amazon, Uber, Robinhood, VMware, Solana, Near, EigenLayer, Magic Eden, Parity, Diem, Linera, and MoonPay.",
      "Featured in the CBOE Innovation Spotlight.",
    ],
  },
  {
    id: "demos", title: "Live demos",
    summary: "Rialo has shipped real-time onchain proofs of concept on its devnet / Apex Network.",
    points: [
      "'Stonk Crush' / Onchain Bloomberg Terminal: a real-time onchain market terminal tracking 1000+ live tickers, verified and settled natively onchain with sub-second proofs and zero oracles.",
    ],
  },
]

export const RIALO_CONTEXT = RIALO_KB
  .map((s) => `## ${s.title}\n${s.summary}\n${s.points.map((p) => "- " + p).join("\n")}`)
  .join("\n\n")
