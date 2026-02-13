
🌍 Languages: [English](./README.md) | [Français](README.fr.md) | [日本語](README.ja.md)

# 🪙 Bouya-Bouya Blockchain 🚀

### Réseau distribué P2P (Node.js)

Bouya-Bouya est une blockchain minimaliste.  
Elle implémente les concepts fondamentaux d'un registre distribué : signatures **ECDSA**, propagation **P2P**, gestion de **Mempool**, et consensus par **Master-Node**.

---

# 🚀 Fonctionnalités

* **Réseau Hybride** : Support du mode `Docker` (Dev) et du mode `IP` (réseau local).
* **Consensus & Forge** :
* **Master (Node1)** : Responsable de la forge des blocs et de la création monétaire.
* **Followers (NodeX)** : Validation passive, synchronisation et relais.

* **Sécurité Cryptographique** :
* Signatures **secp256k1** via `@noble/curves`.
* Intégrité des blocs par chaînage SHA-256.

* **Mécanismes de Résilience** :
* **Polling Périodique** : Les nœuds followers interrogent les pairs toutes les 15 s pour éviter d'être désynchronisés.
* **Bootstrap Immédiat** : Forgeage d'un "Bloc #1" instantané au démarrage du Master pour injecter la monnaie.

* **Dashboard Interactif** : Interface Web en temps réel pour monitorer la chaîne, le mempool et envoyer des transactions.

---

# 🧱 Architecture Technique

### Structure d'un Bloc

Chaque bloc contient un en-tête cryptographique et un corps de données :

* `index`, `previousHash`, `timestamp`, `hash`
* `signer` & `signature` (Preuve d'autorité du Master)
* `data.transactions[]` (Liste des transactions confirmées)

### Le Ledger (Soldes)

Le solde n'est jamais stocké tel quel. Il est **recalculé dynamiquement** à chaque synchronisation ou réception de bloc en "rejouant" l'historique des transactions.

---

# 🛠 Installation & Configuration

Tout d'abords Windows [Firewall](FirewallNecessaryAction.fr.md)

## 1. Prérequis

```bash
npm install express dotenv @noble/curves @noble/hashes crypto-js
```
 Pour la création des wallets.

* utilisez "wallet.js" installez elliptic provisoirement et désinstallez

```bash
npm install elliptic
```

## 2. Variables d'Environnement (.env)

### Docker

```bash
docker compose down
docker-compose build --no-cache
docker-compose up
```

```ini
NETWORK_MODE=docker #ip ou docker

# Nœud 1 (Admin)
MASTER_ID=node1
node_id1=node1

NODE1_PRIVATE_KEY=07d69...
NODE1_PUBLIC_KEY=04009...

# Nœud 2
node_id2=node2
NODE2_PRIVATE_KEY=c6533...
NODE2_PUBLIC_KEY=04380...

# Nœud 3
node_id3=node3
NODE3_PRIVATE_KEY=ce05e...
NODE3_PUBLIC_KEY=04540...
```

### Node

```ini
NETWORK_MODE=ip #ip ou docker

# Nœud 1 (Admin)
MASTER_ID=node1
NODE_ID=node1

# Nœud 1 (Admin)
NODE1_PRIVATE_KEY=07d69...
NODE1_PUBLIC_KEY=04009...

# Nœud 2
NODE2_PUBLIC_KEY=04380...

# Nœud 3
```

## 3. Fichier des Pairs (peers.json)

Indiquez les adresses IP de vos machines physiques :
Pour les obtenir "ipconfig"

```json
{
  "peersIP": ["192.168.0.0:5001", "192.168.0.0:5002"],
  "peersDocker": ["node1", "node2", "node3", "node4", "node5"]
}
```

---

## ▶️ Utilisation (Mode Local/IP: Node)

Pour lancer le Master (PC 1) :

```powershell
$env:NODE_ID="node1"; $env:P2P_PORT="5001"; $env:WEB_PORT="3001"; node index.js
```

Pour lancer un Follower (PC 2) :

```powershell
$env:NODE_ID="node2"; $env:P2P_PORT="5002"; $env:WEB_PORT="3002"; node index.js
```

---

## 💸 Cycle de vie d'une Transaction

1. **Émission** : Création via le Dashboard Web.
2. **Signature** : Signature locale avec la clé privée de l'émetteur.
3. **Diffusion** : Propagation `NEW_TX` à tous les nœuds connectés.
4. **Mempool** : Attente dans la réserve des nœuds (vérification du solde).
5. **Mining** : Inclusion dans le prochain bloc par le Master (toutes les 20 s).
6. **Confirmation** : Réception du `NEW_BLOCK`, mise à jour des balances et nettoyage du mempool.

---

## 📌 À savoir

* **Mint** : Seul le Master peut émettre des transactions `from: "MINT"`.
* **Identifiant** : L'`id` d'une transaction est calculé par `SHA-256(from + to + amount + timestamp)`.

---
