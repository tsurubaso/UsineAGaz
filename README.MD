

# 🪙 Bouya-Bouya Blockchain 🚀

Welcome! Please choose your language if it is not English:

* 🇫🇷 Français → [README en Français](DOC/README.fr.md)
* 🇯🇵 日本語 → [日本語README](DOC/README.ja.md)

---

## Distributed PoA Blockchain (Node.js)

Bouya-Bouya is an educational yet structurally robust blockchain implementation built from scratch in Node.js.

It focuses on **network correctness**, **cryptographic integrity**, and **synchronization safety**, rather than raw performance.

The project now includes:

* Proof-of-Authority consensus (single Master)
* Deterministic ledger reconstruction
* Full and incremental synchronization
* Robust TCP framing
* End-to-end encrypted P2P channels (ECDH + AES-GCM)
* TLS support with mini-PKI
* Real-time dashboard

This is no longer a “toy blockchain”, but a controlled experimental distributed system.

---

# 🚀 Core Features

## 🏛 Consensus – Proof of Authority (PoA)

* **Single Master Node** (authority)

  * Sole block forger
  * Sole monetary issuer (`MINT`)
  * Signs every block (secp256k1)

* **Follower Nodes**

  * Passive validators
  * Verify block signature
  * Recompute ledger deterministically
  * Maintain mempool consistency

Blocks are forged at fixed intervals and propagated across the network.

---

## 🔐 Cryptography

* **ECDSA (secp256k1)** via `@noble/curves`
* **SHA-256** block hashing (chain integrity)
* **Transaction ID** = deterministic SHA-256 fingerprint
* **ECDH key exchange** between peers
* **AES-256-GCM** encrypted P2P payloads
* Optional **TLS transport layer** with mini Certificate Authority

Every block includes:

* `index`
* `previousHash`
* `timestamp`
* `hash`
* `signer`
* `signature`
* `data.transactions[]`

---

## 🔁 Synchronization Model

Bouya-Bouya implements two complementary sync strategies:

### 1️⃣ Full Sync

When a node starts or detects divergence:

* Downloads full blockchain
* Replays all transactions
* Reconstructs ledger from genesis

### 2️⃣ Incremental Sync

When already aligned:

* Accepts `NEW_BLOCK`
* Applies transactions
* Cleans mempool
* Updates balances deterministically

Balances are never stored as source of truth.
They are always derived from chain replay.

---

## 🌐 Network Layer

Built directly on raw TCP sockets.

Includes:

* Length-prefix message framing
* Buffer reassembly loop (`while(buffer.length >= expectedLength)`)
* JSON boundary safety
* Bidirectional encrypted channels
* Clean shutdown handling
* Peer reconnection logic

Educational resource about TCP framing:
👉 [https://github.com/tsurubaso/TCPmogi](https://github.com/tsurubaso/TCPmogi)

---

## 🧠 Mempool Logic

* Signature verification on reception
* Balance validation before acceptance
* Duplicate protection via transaction ID
* Automatic cleanup after block inclusion
* Deterministic consistency across nodes

---

## 📊 Web Dashboard

Each node exposes a web interface:

* Blockchain explorer
* Live mempool view
* Real-time balances
* Transaction creation
* Network monitoring

---

# 🔐 Secure Network (TLS Mode)

Bouya-Bouya supports encrypted TLS communication using a lightweight PKI.

To add a new node:

➡️ [Join the Bouya-Bouya TLS Network](DOC/JoinTLSNetwork.md)

---

# 🛠 Installation

## Requirements

```bash
npm install express dotenv @noble/curves @noble/hashes crypto-js
```

For wallet generation (temporary dependency):

```bash
npm install elliptic
```

---

# ⚙ Configuration

## Docker Mode (Development)

```bash
docker compose down
docker-compose build --no-cache
docker-compose up
```

`.env` example:

```ini
NETWORK_MODE=docker

MASTER_ID=node1
node_id1=node1

NODE1_PRIVATE_KEY=...
NODE1_PUBLIC_KEY=...

node_id2=node2
NODE2_PRIVATE_KEY=...
NODE2_PUBLIC_KEY=...
```

---

## IP Mode (Physical Machines)

`.env` example:

```ini
NETWORK_MODE=ip

MASTER_ID=node1
NODE_ID=node1

NODE1_PRIVATE_KEY=...
NODE1_PUBLIC_KEY=...

NODE2_PUBLIC_KEY=...
```

`peers.json`:

```json
{
  "peersIP": ["192.168.0.10:5001", "192.168.0.11:5002"],
  "peersDocker": ["node1", "node2", "node3"]
}
```

---

# ▶️ Run a Node (IP Mode)

Master:

```powershell
$env:NODE_ID="node1"; $env:P2P_PORT="5001"; $env:WEB_PORT="3001"; node index.js
```

Follower:

```powershell
$env:NODE_ID="node2"; $env:P2P_PORT="5002"; $env:WEB_PORT="3002"; node index.js
```

---

# 💸 Transaction Lifecycle

1. Created via dashboard
2. Signed locally (private key)
3. Broadcast to peers (`NEW_TX`)
4. Validated & stored in mempool
5. Forged into block by Master
6. Block signed
7. Propagated (`NEW_BLOCK`)
8. Ledger replayed
9. Mempool cleaned

---

# 📌 Design Principles

* Deterministic state
* Single source of truth = blockchain
* No stored balances
* Strict authority validation
* Cryptographic integrity everywhere
* Network correctness before optimization

---

Si tu veux, on peut maintenant :

* soit faire une version plus “GitHub marketing” (plus impactante),
* soit une version encore plus technique (orientée architecture distribuée),
* soit restructurer pour que ça ressemble à un vrai projet open-source mature avec diagramme logique et section “Security Model”.
