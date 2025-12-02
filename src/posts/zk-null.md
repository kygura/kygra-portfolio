---
title: "The zkNull Project"
date: "2025-11-30"
description: "Why I built a privacy primitive in an age of total financial surveillance, and why the transparency of public blockchains is a bug, not a feature."
tags: ["cryptography", "ethereum"]
published: true
---


## The Panopticon on the Blockchain

Truth is, I'm a bit disappointed with the current state of affairs in the crypto space. 
The early eth adopters & cryptophunks promised that a public ledger was the ultimate tool for accountability, a way to keep the powerful in check.
In practice, the "immutable public ledger" has morphed into the most sophisticated surveillance apparatus ever constructed.

Every transaction you make is etched permanently into history. Your salary, your donations, your good & bad trades, your medical payments. It's all there, waiting to be scraped by Chainalysis and Arkham Intelligence to be sold to government agencies.

This is financial voyeurism disguised as "openness."

If you're a business, you can't negotiate deals when your competitors are watching your wallet. If you're an individual, you can't buy a coffee without the barista potentially seeing your entire net worth. The system is broken because it assumes that *identity* and *verification* must be inextricably linked. They don't.

## The Philosophy of Zero Knowledge

The core philosophy is simple: **Privacy is a primitive and non-negotiable right.**

If you don't have privacy at the base layer, you don't have a functional cryptocurrency. For me it stands as both a double entendre for both the tech behind it, but also the right for private transacting.

Inspired by Tornado Cash, I am building a *standard*. zkNull is an ERC-20 token that behaves like cash. It's composable and fits into the existing DeFi economy. 

## The Architecture

At its heart, zkNull uses **zk-SNARKs** (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge). The concept is elegant: verify that a secret exists, without revealing the secret itself.

The system is built on four core components:

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend/Client                      │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   Wallet    │  │   Crypto    │  │   Merkle    │           │
│  │ Integration │  │   Utils     │  │   Helper    │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                              │
│     ┌───────────────────────────────────────────────┐        │
│     │         zk-SNARK Proof Generation             │        │
│     │         (circomlibjs + snarkjs)               │        │
│     └───────────────────────────────────────────────┘        |  
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Web3 / ethers.js
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                      Ethereum Blockchain                     │
│  ┌─────────────┐         ┌─────────────┐                     │
│  │PrivacyToken │◄────────┤ PrivacyPool │                     │
│  │   (ERC-20)  │         │             │                     │
│  └─────────────┘         │ ┌─────────┐ │                     │
│                          │ │ Merkle  │ │                     │
│                          │ │  Tree   │ │                     │
│                          │ └─────────┘ │                     │
│                          │ ┌─────────┐ │                     │
│                          │ │Verifier │ │                     │
│                          │ └─────────┘ │                     │
│                          └─────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

### The Commitment Scheme (Merkle Trees)

When you deposit funds, you are sending tokens to a contract and generating a **commitment**.
Think of this as a cryptographic lockbox. You generate two random numbers locally on your machine:
1.  A `secret` (your private key to the funds)
2.  A `nullifier` (a unique ID that prevents double-spending)

You hash these together using the **Poseidon hash function** (optimized for ZK circuits) to create the commitment:

```
commitment = Poseidon(secret, nullifier)
```

This commitment is then inserted into an on-chain **Merkle Tree**. This tree is a massive data structure that records every deposit ever made. With 20 levels, it can hold over 1 million deposits. The smart contract updates the "root" of this tree, a single hash that represents the entire state of the system.

The tree structure looks like this:

```
Tree with 20 levels = 2^20 = ~1 million capacity

Level 0 (leaves):  C1  C2  C3  C4  C5  C6  C7  C8 ...
Level 1:            H(C1,C2)  H(C3,C4)  H(C5,C6) ...
Level 2:                H(H1,H2)      H(H3,H4) ...
...
Level 19 (root):               ROOT
```

### The Nullifier: Solving the Double-Spend

Here is the clever part. When you withdraw, you don't reveal your commitment. If you did, everyone would know which deposit was yours.

Instead, you generate a **Zero-Knowledge Proof** inside your browser. This proof asserts three things mathematically:
1.  "I know a `secret` and `nullifier` that corresponds to a commitment..."
2.  "...that exists somewhere in this Merkle Tree..."
3.  "...and here is the `Hash(nullifier)` to prove I haven't spent it yet."

The contract verifies this proof using a Groth16 verifier (generated by snarkjs). It checks the `nullifierHash` against a list of already-spent funds. If both check out, it releases the funds to a completely new address.

The proof itself is compact (around 256 bytes) and takes 1-5 seconds to generate in the browser. Verification on-chain costs around 300k gas on Ethereum L1, but drops to a fraction of that on L2s like Arbitrum or Optimism.

### The Flow

The user experience is designed to be frictionless:

**Deposit:**
```
1. Generate secret + nullifier (off-chain)
2. Compute commitment = hash(secret, nullifier)
3. Transfer tokens + burn fee to contract
4. Insert commitment into Merkle tree
5. Save secret+nullifier securely as a "note"
```

**Withdrawal:**
```
1. Load note (secret, nullifier)
2. Get Merkle proof from local tree or indexer
3. Generate zk-SNARK proof (browser, 1-5 seconds)
4. Submit proof to contract
5. Contract verifies proof
6. Check nullifier not spent
7. Transfer tokens to fresh address
8. Mark nullifier as spent
```

The interface handles the proof generation and withdrawal in a single click. Behind the scenes, the protocol manages the commitment generation, Merkle proof construction, and zk-SNARK proving.

## Security Properties

The system is designed to resist several attack vectors:

**1. Amount Correlation Attack**
If someone deposits 17.384 tokens and someone withdraws 17.384 tokens, there's an obvious link. Solution: Fixed denominations (1, 10, 100, 1000). All deposits and withdrawals are the same amount.

**2. Timing Analysis Attack**
If you deposit and withdraw within 1 minute, temporal correlation reveals identity. Solution: Wait random time (hours to days). The larger the anonymity set, the stronger the privacy.

**3. Double-Spend Prevention**
Nullifiers are unique per deposit. The contract tracks spent nullifiers. The zk-SNARK proves nullifier ownership without revealing which commitment it corresponds to.

**4. Theft Prevention**
You can't withdraw without knowing the secret and nullifier. You can't forge zk-SNARK proofs. You can't reuse spent deposits.

## The End Users

Who is this for?

The cliché answer is "everyone," but let's be specific. The market for zkNull is anyone who realizes that **data is a liability that can be weaponized against them**.

**DAOs & Organizations**: You can't run a treasury if every grant and salary payment is front-run by MEV bots or scrutinized by Twitter anons before the ink is dry. Organizations need the ability to issue private payments, allowing contributors to withdraw their salary to fresh wallets without the world watching.

**Whales & Traders**: If you're moving size, you're a target. Large capital cannot move in the light. Every transfer alerts the market, triggering front-running bots and copy-traders. Privacy isn't about hiding crimes; it's about not getting rekt by predatory algorithms that track your wallet tags.

**The Average User**: Eventually, people will realize that "doxxing yourself to buy an NFT (remember those?)" is nonsense. When that realization hits, they will move to protocols that offer default privacy.

## The Tokenomics

Network activity leads to deflationary burn leads to scarcity.

zkNull introduces a deflationary burn mechanism. Every interaction with the protocol (deposit and withdrawal) burns a small percentage of the supply. This creates several effects:

*   **Burn-on-Use:** A percentage of every withdrawal is burned.
*   **Correlation:** As the demand for privacy grows, the supply of the token decreases.
*   **Sustainability:** Unlike protocols that rely on inflationary farming rewards, the value driver here is utility.

As the anonymity set grows and more people seek shelter in the pool, the token becomes scarcer. It's a bet that the demand for privacy will outpace the demand for transparency. Given the current trajectory of the surveillance state, that seems like a safe bet.

## Scalability & Gas Costs

The primary barrier to privacy has historically been cost. Verifying a zk-SNARK on Ethereum L1 costs around 300k gas, which can be prohibitively expensive for average users.

The L2 strategy solves this:

| Chain | Approx. Cost | Viability |
|-------|--------------|-----------|
| Ethereum L1 | $10 - $50 | Whales Only |
| Arbitrum/Optimism | $0.50 - $2 | Routine Transactions |
| zkSync | < $0.10 | Micro-payments |

By deploying on Arbitrum, Optimism, and zkSync, the cost of privacy drops by 10-50x. This moves the utility from a luxury for the rich to a tool for the many.

The system can also scale through multiple pools for different denominations, allowing parallel processing and better anonymity sets for each use case.

## A Few Considerations on Compliance

The regulators will not like this. The precedent is clear. They will likely want a backdoor or a master key.

Unfortunately for them, this system does not provide that kind of oversight. That is the point of a trustless system. 
If we could decrypt your transactions, this would be a bank. This is not a bank. This is a privatization layer built on top of a public ledger.

I'd like to bet that the "compliance" of the future won't be about surveillance; it will be about *proving* innocence without revealing everything. zk tech enables this. You can voluntarily disclose your view key to an auditor if you need to, but that choice is yours. It must be yours, otherwise you are not free, you only have permission. 

## The Future

I am currently in the implementation phase. The circuits are written (Circom), the contracts are deployed on testnet, and the trusted setup is complete.

The next step is the hardest: bootstrapping the anonymity set. Privacy loves company. A privacy pool with one user is useless. A privacy pool with a million users is impenetrable.

Future enhancements include:
*   **Elastic Supply Mechanism**: Rebase mechanism to maintain price stability
*   **Staking System**: Lock tokens to earn yield from burn fees and participate in governance
*   **Stealth Addresses**: One-time addresses for each withdrawal to prevent address reuse tracking
*   **Cross-Chain Bridges**: Deposit on one chain, withdraw on another, breaking cross-chain analysis

I am building the tools for the new world. A world where you own your data, your money, and your history. The old world is watching. Let's give them nothing to see.
