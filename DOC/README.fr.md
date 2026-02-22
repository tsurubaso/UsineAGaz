

🌍 Languages: [English](../README.MD) | [Français](README.fr.md) | [日本語](README.ja.md)

# 🪙 Bouya-Bouya Blockchain

Réseau distribué P2P en Node.js

Bouya-Bouya est une blockchain pédagogique mais techniquement structurée.
Elle implémente un registre distribué complet avec consensus par **preuve d’autorité (PoA)**, synchronisation multi-nœuds, mempool cohérent, chiffrement des communications et dashboard temps réel.

Le projet est conçu pour comprendre concrètement ce qu’implique la construction d’un réseau blockchain bas niveau : TCP brut, framing, cryptographie, propagation d’état et reconstruction de ledger.

---

# 🚀 Fonctionnalités

## Consensus – Proof of Authority

* Un **Master Node** unique responsable de la forge des blocs.
* Des **Followers** qui valident, synchronisent et relaient.
* Signature des blocs via **secp256k1**.
* Vérification systématique du hash et de la signature du bloc.
* Transactions `MINT` autorisées uniquement pour le Master.

---

## Synchronisation Avancée

* Synchronisation complète de la chaîne au bootstrap.
* Synchronisation incrémentale lors de la réception d’un nouveau bloc.
* Recalcul intégral du ledger après sync.
* Nettoyage automatique du mempool après inclusion en bloc.
* Mécanisme de polling périodique pour éviter la dérive d’état.

---

## Sécurité Cryptographique

* Signatures ECDSA via `@noble/curves` (secp256k1).
* Hash SHA-256 via `@noble/hashes`.
* Échange de clé **ECDH** entre pairs.
* Chiffrement symétrique **AES-256-GCM** des messages P2P.
* Intégrité et authentification des messages réseau.

---

## Réseau P2P Bas Niveau

* Communication TCP native.
* Framing robuste par **Length-Prefix + Buffer + boucle while**.
* Reconstruction correcte des messages fragmentés.
* Gestion propre des connexions et du shutdown.
* Support Docker (dev) et IP (réseau local).

---

## Dashboard Web

Interface Express temps réel permettant :

* Visualisation des blocs.
* Inspection du mempool.
* Affichage des balances.
* Création et signature de transactions.
* Monitoring des pairs connectés.

---

# 🧱 Architecture Technique

## Structure d’un Bloc

Chaque bloc contient :

* `index`
* `previousHash`
* `timestamp`
* `hash`
* `signer`
* `signature`
* `data.transactions[]`

Le hash est calculé sur l’en-tête.
La signature du Master constitue la preuve d’autorité.

---

## Structure d’une Transaction

* `from`
* `to`
* `amount`
* `timestamp`
* `id = SHA256(from + to + amount + timestamp)`
* `signature` (sauf pour `MINT`)

Toute transaction est vérifiée avant entrée en mempool :

* signature valide
* solde suffisant
* id cohérent

---

## Ledger

Aucun solde n’est stocké.

Le ledger est **reconstruit dynamiquement** en rejouant l’intégralité de la chaîne :

1. Reset des balances
2. Parcours des blocs
3. Application séquentielle des transactions

Ce mécanisme garantit la cohérence inter-nœuds.

---

# 🔐 Réseau Sécurisé (TLS / PKI)

Les nœuds peuvent communiquer via TLS avec mini autorité de certification.

Pour ajouter un nouveau nœud au réseau sécurisé :

➡️ Voir `JoinTLSNetwork.md`

---

# 📚 Référence Pédagogique – TCP Framing

Le projet repose sur un framing TCP robuste.

Mini-repository explicative :

👉 TCP Message Framing (Length-Prefix + Buffer + while)
[https://github.com/tsurubaso/TCPmogi](https://github.com/tsurubaso/TCPmogi)

Pourquoi JSON casse en TCP ?
Comment reconstruire correctement les messages fragmentés ?
Ce repo détaille le mécanisme utilisé ici.

---

# 🛠 Installation

## Prérequis

```bash
npm install express dotenv @noble/curves @noble/hashes crypto-js
```

Pour la génération des wallets :

```bash
npm install elliptic
```

Puis suppression après génération.

---

# ⚙ Configuration

## .env – Mode Docker

```ini
NETWORK_MODE=docker
MASTER_ID=node1

node_id1=node1
NODE1_PRIVATE_KEY=...
NODE1_PUBLIC_KEY=...

node_id2=node2
NODE2_PRIVATE_KEY=...
NODE2_PUBLIC_KEY=...

node_id3=node3
NODE3_PRIVATE_KEY=...
NODE3_PUBLIC_KEY=...
```

---

## .env – Mode IP

```ini
NETWORK_MODE=ip
MASTER_ID=node1
NODE_ID=node1

NODE1_PRIVATE_KEY=...
NODE1_PUBLIC_KEY=...

NODE2_PUBLIC_KEY=...
```

---

## peers.json

```json
{
  "peersIP": ["192.168.0.10:5001", "192.168.0.11:5002"],
  "peersDocker": ["node1", "node2", "node3"]
}
```

---

# ▶️ Lancement

Master :

```powershell
$env:NODE_ID="node1"; $env:P2P_PORT="5001"; $env:WEB_PORT="3001"; node index.js
```

Follower :

```powershell
$env:NODE_ID="node2"; $env:P2P_PORT="5002"; $env:WEB_PORT="3002"; node index.js
```

---

# 🔁 Cycle de Vie d’une Transaction

1. Création via le dashboard.
2. Signature locale.
3. Diffusion `NEW_TX`.
4. Validation et insertion en mempool.
5. Forge du bloc par le Master (intervalle fixe).
6. Diffusion `NEW_BLOCK`.
7. Recalcul du ledger.
8. Nettoyage du mempool.

---

# 📌 Points Clés

* Seul le Master peut créer des transactions `MINT`.
* Le réseau est déterministe : tout nœud peut reconstruire l’état complet.
* La cohérence est garantie par la signature des blocs et la revalidation locale.
* Le système est conçu pour être lisible, pédagogique et modulaire.

---

Bouya-Bouya n’est pas une blockchain industrielle.
C’est un laboratoire technique pour comprendre en profondeur :

* consensus
* propagation réseau
* cryptographie appliquée
* cohérence distribuée
* résilience P2P

Et surtout : ce que signifie réellement « faire une blockchain » en partant du TCP brut.
