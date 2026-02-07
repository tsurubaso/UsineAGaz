
---

# Bouya‑Bouya Blockchain — Mini‑réseau distribué en Node.js

Bouya‑Bouya est une blockchain pédagogique minimaliste, distribuée sur plusieurs nœuds TCP, avec signatures ECDSA secp256k1, propagation réseau, mempool, forge de blocs et dashboard web intégré.  
Chaque nœud fonctionne dans un conteneur ou en mode IP, et synchronise sa copie locale de la chaîne.

---

## 🚀 Fonctionnalités principales

- Réseau pair‑à‑pair via TCP (port 5000)
- Blockchain complète avec :
  - Genesis signé
  - Chaînage cryptographique SHA‑256
  - Validation stricte des blocs
- Transactions signées (ECDSA secp256k1)
- Mempool distribué avec anti‑doublons
- Forge automatique de blocs (master uniquement)
- Propagation réseau :
  - `GET_CHAIN`
  - `FULL_CHAIN`
  - `NEW_TX`
  - `NEW_BLOCK`
- Ledger local recalculé à partir de la chaîne
- Système de mint contrôlé (master seulement)
- Dashboard web par nœud (port 300X)
- Synchronisation automatique au démarrage

---

## 🧱 Architecture du réseau

Le réseau est composé de plusieurs nœuds :

- `node1` : **master**
  - Forge les blocs
  - Peut créer de la monnaie (mint)
- `node2`, `node3`, … : **followers**
  - Reçoivent les blocs
  - Maintiennent leur mempool
  - Valident les transactions

Chaque nœud possède :

- une clé privée
- une clé publique
- un mempool local
- une copie locale de la blockchain
- un ledger dérivé de la chaîne

---

## 🔐 Cryptographie

### Signatures
- Courbe : **secp256k1** (via `@noble/curves`)
- Chaque transaction est signée avec la clé privée de l’émetteur
- Les blocs sont signés uniquement par le master

### Hashs
- SHA‑256 pour :
  - les transactions
  - les blocs
  - les identifiants de transaction

---

## 🔄 Synchronisation réseau

Au démarrage :

1. Le nœud contacte tous ses pairs via `GET_CHAIN`
2. Le peer répond avec `FULL_CHAIN`
3. Le nœud valide la chaîne reçue :
   - Genesis strict
   - Hashs
   - Signatures
4. La chaîne la plus longue est adoptée
5. Le master exécute le **bootstrap monétaire** (mint + distribution)

Pendant la vie du réseau :

- Les transactions se propagent via `NEW_TX`
- Les blocs se propagent via `NEW_BLOCK`
- Le mempool est nettoyé automatiquement lorsque les transactions sont confirmées

---

## ⛏️ Forge de blocs (master uniquement)

Toutes les 20 secondes :

1. Le master prend **tout le mempool**
2. Crée un bloc :
   - index
   - previousHash
   - timestamp
   - transactions
3. Calcule le hash structurel
4. Signe le bloc
5. L’ajoute à sa chaîne
6. Applique les transactions au ledger
7. Diffuse le bloc aux autres nœuds

Les followers :

- Vérifient le bloc
- Nettoient leur mempool
- Appliquent les transactions

---

## 💸 Transactions

Format :

```json
{
  "from": "<publicKey>",
  "to": "<publicKey>",
  "amount": 42,
  "timestamp": 1700000000000,
  "signature": "<hex>",
  "id": "<sha256>"
}
```

Validation :

- Signature ECDSA valide
- Solde suffisant (sauf mint)
- Anti‑doublon via `id`

Propagation automatique à tous les peers.

---

## 🪙 Mint & Bootstrap monétaire

Uniquement pour `node1`.

Au premier démarrage :

1. Mint de 1000 Bouya pour le master
2. Distribution automatique :
   - 100 Bouya → node2
   - 100 Bouya → node3
3. Les transactions sont ajoutées au mempool
4. Elles seront confirmées dans le premier bloc forgé

---

## 🌐 Dashboard Web

Chaque nœud expose une interface web :

```
http://localhost:3001  → node1
http://localhost:3002  → node2
http://localhost:3003  → node3
```

Affiche :

- Nombre de blocs
- Taille du mempool
- Soldes
- Logs récents
- Formulaire pour créer une transaction

---

## ⚙️ Configuration

### Variables d’environnement

```
NODE_ID=node1
MASTER_ID=node1
NETWORK_MODE=docker | ip

NODE1_PRIVATE_KEY=...
NODE1_PUBLIC_KEY=...
NODE2_PRIVATE_KEY=...
NODE2_PUBLIC_KEY=...
NODE3_PRIVATE_KEY=...
NODE3_PUBLIC_KEY=...
```

### peers.json

```json
{
  "peersDocker": ["node1", "node2", "node3"],
  "peersIP": ["192.168.0.10:5000", "192.168.0.11:5000"]
}
```

---

## ▶️ Lancement

### Mode Docker
Chaque conteneur définit son `NODE_ID`.

### Mode local
Lancer plusieurs instances :

```
NODE_ID=node1 node app.js
NODE_ID=node2 node app.js
NODE_ID=node3 node app.js
```

---

## 📁 Structure du projet

```
.
├── app.js
├── peers.json
├── .env
└── README.md
```

---

## 🧪 Tests manuels

- Créer une transaction via le dashboard
- Vérifier sa propagation dans les logs
- Attendre la forge du bloc
- Vérifier la mise à jour des soldes
- Vérifier la suppression du mempool

---

## 📌 Objectifs pédagogiques

Ce projet illustre :

- la logique d’une blockchain distribuée
- la propagation P2P
- la validation cryptographique
- la gestion d’un mempool
- la forge de blocs
- la synchronisation de chaînes
- la gestion d’un ledger dérivé

---