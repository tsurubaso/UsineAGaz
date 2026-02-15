
# 🪙 Bouya‑Bouya Blockchain 🚀

Welcome! Please choose your language if it is not English:

- 🇫🇷 Français → [README en Français](DOC/README.fr.md)
- 🇯🇵 日本語 → [日本語README](DOC/README.ja.md)

 
### Distributed P2P Network (Node.js)

Bouya-Bouya is a minimalist blockchain.  
It implements the core concepts of a distributed ledger: **ECDSA** signatures, **P2P** propagation, **Mempool** management, and **Master-Node** consensus.

---

# 🚀 Features

* **Hybrid Network**: Supports both `Docker` mode (Dev) and `IP` mode (local network).
* **Consensus & Forging**:
* **Master (Node1)**: Responsible for block forging and monetary issuance.
* **Followers (NodeX)**: Passive validation, synchronization, and relay.

* **Cryptographic Security**:
* **secp256k1** signatures via `@noble/curves`.
* Block integrity ensured through SHA-256 chaining.

* **Resilience Mechanisms**:
* **Periodic Polling**: Follower nodes query peers every 15 s to avoid desynchronization.
* **Immediate Bootstrap**: Instant forging of a "Block #1" at Master startup to inject currency.

* **Interactive Dashboard**: Real-time web interface to monitor the chain, the mempool, and send transactions.

---

# 🧱 Technical Architecture

### Block Structure

Each block contains a cryptographic header and a data body:

* `index`, `previousHash`, `timestamp`, `hash`
* `signer` & `signature` (Master proof of authority)
* `data.transactions[]` (List of confirmed transactions)

### The Ledger (Balances)

Balances are never stored directly. They are **dynamically recalculated** at each synchronization or block reception by "replaying" the transaction history.

---

## 📚 Learning Resources

This project is based on low-level networking concepts (TCP streams, buffering, message framing).

I created a small educational repository dedicated to this topic:

👉 **TCP Message Framing (Length-Prefix + Buffer + while)**  
https://github.com/tsurubaso/TCPmogi

📖 Documentation:  
[Read the README](https://github.com/tsurubaso/TCPmogi/blob/main/README.en.md)

This mini-repo explains why JSON can break over TCP and how to properly reconstruct complete messages.

---
## 🔐 Secure Network (TLS)

Bouya-Bouya nodes communicate over **encrypted TLS channels**, using a small Certificate Authority (mini-PKI).

If you want to add a new node (Node2, Node3, …) to the network, follow the step-by-step guide here:

➡️ **[Join the Bouya-Bouya TLS Network](DOC/JoinTLSNetwork.md)**

---

# 🛠 Installation & Configuration


But first Windows [Firewall](DOC/FirewallNecessaryAction.en.md)

## 1. Requirements

```bash
npm install express dotenv @noble/curves @noble/hashes crypto-js
```

For wallet creation:

* Use `wallet.js`, temporarily install and uninstall elliptic:

```bash
npm install elliptic
```

## 2. Environment Variables (.env)

### Docker

```bash
docker compose down
docker-compose build --no-cache
docker-compose up
```

```ini
NETWORK_MODE=docker #ip or docker

# Node 1 (Admin)
MASTER_ID=node1
node_id1=node1

NODE1_PRIVATE_KEY=07d69...
NODE1_PUBLIC_KEY=04009...

# Node 2
node_id2=node2
NODE2_PRIVATE_KEY=c6533...
NODE2_PUBLIC_KEY=04380...

# Node 3
node_id3=node3
NODE3_PRIVATE_KEY=ce05e...
NODE3_PUBLIC_KEY=04540...
```

### Node

```ini
NETWORK_MODE=ip #ip or docker

# Node 1 (Admin)
MASTER_ID=node1
NODE_ID=node1

# Node 1 (Admin)
NODE1_PRIVATE_KEY=07d69...
NODE1_PUBLIC_KEY=04009...

# Node 2
NODE2_PUBLIC_KEY=04380...

# Node 3
```

## 3. Peer File (peers.json)

Provide the IP addresses of your physical machines:
To get them, use "ipconfig"

```json
{
  "peersIP": ["192.168.0.0:5001", "192.168.0.0:5002"],
  "peersDocker": ["node1", "node2", "node3", "node4", "node5"]
}
```

---

## ▶️ Usage (Local/IP Mode: Node)

To start the Master (PC 1):

```powershell
$env:NODE_ID="node1"; $env:P2P_PORT="5001"; $env:WEB_PORT="3001"; node index.js
```

To start a Follower (PC 2):

```powershell
$env:NODE_ID="node2"; $env:P2P_PORT="5002"; $env:WEB_PORT="3002"; node index.js
```

---

## 💸 Transaction Lifecycle

1. **Emission**: Created via the Web Dashboard.
2. **Signature**: Locally signed with the sender’s private key.
3. **Broadcast**: `NEW_TX` propagation to all connected nodes.
4. **Mempool**: Waiting in the node pool (balance verification).
5. **Mining**: Included in the next block by the Master (every 20 s).
6. **Confirmation**: Reception of `NEW_BLOCK`, balance updates, and mempool cleanup.

---

## 📌 Notes

* **Mint**: Only the Master can issue transactions with `from: "MINT"`.
* **Identifier**: A transaction `id` is computed as
  `SHA-256(from + to + amount + timestamp)`.

---
