🌍 Languages: [English](README) | [Français](README.fr.md) | [日本語](README.ja.md)


# 🪙 Bouya‑Bouya Blockchain 🚀

### Mini‑réseau distribué P2P en Node.js

Bouya‑Bouya est une blockchain pédagogique minimaliste et robuste. Elle implémente les concepts fondamentaux d'un registre distribué : signatures **ECDSA**, propagation **P2P**, gestion de **Mempool**, et consensus par **Master-Node**.

---

## 🚀 Fonctionnalités Avancées

* **Réseau Hybride** : Support natif du mode `Docker` (noms d'hôtes) et du mode `IP` (réseau local).
* **Consensus & Forge** :
* **Master (Node1)** : Responsable de la forge des blocs et de la création monétaire.
* **Followers (NodeX)** : Validation passive, synchronisation et relais.


* **Sécurité Cryptographique** :
* Signatures **secp256k1** via `@noble/curves`.
* Intégrité des blocs par chaînage SHA‑256.


* **Mécanismes de Résilience** :
* **Polling Périodique** : Les nœuds followers interrogent les pairs toutes les 15s pour éviter d'être désynchronisés.
* **Bootstrap Immédiat** : Forgeage d'un "Bloc #1" instantané au démarrage du Master pour injecter la monnaie.


* **Dashboard Interactif** : Interface Web en temps réel pour monitorer la chaîne, le mempool et envoyer des transactions.

---

## 🧱 Architecture Technique

### Structure d'un Bloc

Chaque bloc contient un en-tête cryptographique et un corps de données :

* `index`, `previousHash`, `timestamp`, `hash`
* `signer` & `signature` (Preuve d'autorité du Master)
* `data.transactions[]` (Liste des transactions confirmées)

### Le Ledger (Soldes)

Le solde n'est jamais stocké tel quel. Il est **recalculé dynamiquement** à chaque synchronisation ou réception de bloc en "rejouant" l'historique des transactions.

---

## 🔄 Flux de Synchronisation

1. **Initial Sync** : Au démarrage, le nœud demande la chaîne complète (`GET_CHAIN`).
2. **Validation** : Vérification récursive des signatures et de la continuité des hashs.
3. **Replay** : Calcul des soldes à partir des blocs validés.
4. **Maintenance** :
* **Actif** : Réception de `NEW_BLOCK` via propagation.
* **Passif** : Polling régulier pour rattraper les blocs manqués.



---

## 🛠 Installation & Configuration

### 1. Prérequis

```bash
npm install express dotenv @noble/curves @noble/hashes

```

### 2. Variables d'Environnement (.env)

```ini
# Identité du nœud
NODE_ID=node2
MASTER_ID=node1
NETWORK_MODE=ip

# Ports
P2P_PORT=5002
WEB_PORT=3002

# Clés (Hex) - Répéter pour chaque Node
NODE1_PUBLIC_KEY=04...
NODE1_PRIVATE_KEY=...

```

### 3. Fichier des Pairs (peers.json)

Indiquez les adresses IP de vos machines physiques :

```json
{
  "peersIP": ["192.168.0.000:5001", "192.168.0.000:5002"]
}

```

---

## ▶️ Utilisation (Mode Local/IP)

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
5. **Mining** : Inclusion dans le prochain bloc par le Master (toutes les 20s).
6. **Confirmation** : Réception du `NEW_BLOCK`, mise à jour des balances et nettoyage du mempool.

---

## 📌 À savoir

* **Mint** : Seul le Master peut émettre des transactions `from: "MINT"`.
* **Identifiant** : L'`id` d'une transaction est calculé par `SHA-256(from + to + amount + timestamp)`.

---
