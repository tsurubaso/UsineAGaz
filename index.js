import crypto from "crypto";
import net from "net";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";

/*
════════════════════════════════════════
0. CONFIGURATION DU NŒUD
════════════════════════════════════════
Chaque conteneur définit NODE_ID
(node1 = master / node2, node3 = followers)
*/

const nodeID = process.env.NODE_ID;
const privateKey = process.env.NODE1_PRIVATE_KEY;
const publicKey = process.env.NODE1_PUBLIC_KEY;

// Liste statique de peers (simplifié volontairement)
const peers = ["node1", "node2", "node3"].filter((id) => id !== nodeID);

console.log(`\n--- DÉMARRAGE DU NŒUD ${nodeID} ---`);

/*
════════════════════════════════════════
1. ÉTAT LOCAL
════════════════════════════════════════
Chaque nœud possède sa copie locale
de la blockchain.
*/

let blockchain = [];

/*
════════════════════════════════════════
A. POOL DE TRANSACTIONS
════════════════════════════════════════

Chaque nœud maintient un pool de
transactions en attente d’inclusion
dans un bloc.
Chaque nœud:
-reçoit des transactions
-les vérifie
-les stocke temporairement

Nouveau message réseau: "NEW_TX"

client → node → mempool → (plus tard) block

Message transaction:
{
  from: <publicKey>,
  to: <publicKey>,
  amount: number,
  timestamp: string,
  signature: hex
}

*/

let mempool = [];

/*
════════════════════════════════════════
ÉTAT DES SOLDES (LEDGER LOCAL)
════════════════════════════════════════
- Dérivé de la blockchain
- Jamais envoyé sur le réseau
- Recalculable à tout moment
*/
let balances = {};

/*
════════════════════════════════════════
ÉTAT DES SERVICES (ENGAGEMENTS)
════════════════════════════════════════
Un service est un accord social :
- un demandeur
- un prestataire
- un paiement en deux temps
*/

let services = {};

/*
Structure d’un service :

services[serviceId] = {
  client: <publicKey>,
  worker: <publicKey>,
  totalAmount: number,
  paidBefore: number,
  paidAfter: number,
  status: "CREATED" | "STARTED" | "DONE" | "ABANDONED"
}
*/

/*
════════════════════════════════════════
TRANSACTION SPÉCIALE : MINT
════════════════════════════════════════
- Seul node1 a le droit de créer de la monnaie
- Pas de signature requise
- Utilisée uniquement dans le Genesis (pour l’instant)
*/

function isMintTransaction(tx) {
  return tx.from === "MINT";
}

/*
═══════════════════════════════════════
BOOTSTRAP MONÉTAIRE
- Node1 crée la monnaie après démarrage
- Puis distribue aux autres nodes
- Ne touche pas au Genesis
═══════════════════════════════════════
*/

let bootstrapDone = false;

function bootstrapMoney() {
  if (bootstrapDone) return;

  // Seul node1 a le droit de faire ça
  if (nodeID !== "node1") return;

  console.log(`[node1] 🪙 Bootstrapping Bouya-Bouya...`);

  // 1) Mint initial
  const mintTx = {
    from: "MINT",
    to: publicKey,
    amount: 1000,
    timestamp: Date.now(),
    signature: null,
  };

  mintTx.id = createTransactionId(mintTx);
  mempool.push(mintTx);

  // 2) Distribution immédiate
  const payNode2 = {
    from: publicKey,
    to: process.env.NODE2_PUBLIC_KEY,
    amount: 100,
    timestamp: Date.now(),
  };

  payNode2.signature = signTransaction(payNode2, privateKey);
  payNode2.id = createTransactionId(payNode2);

  mempool.push(payNode2);

  const payNode3 = {
    from: publicKey,
    to: process.env.NODE3_PUBLIC_KEY,
    amount: 100,
    timestamp: Date.now(),
  };

  payNode3.signature = signTransaction(payNode3, privateKey);
  payNode3.id = createTransactionId(payNode3);

  mempool.push(payNode3);

  console.log(`[node1] ✅ Mint + distribution ajoutés au mempool`);

  bootstrapDone = true;
}

/*
Applique une transaction aux soldes
⚠️ suppose que la transaction est valide
*/
function applyTransaction(tx, balances) {
  // Cas spécial : création monétaire
  if (isMintTransaction(tx)) {
    balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
    return;
  }

  // Cas normal : transfert
  balances[tx.from] = (balances[tx.from] || 0) - tx.amount;
  balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
}

/*
Vérifie que l’émetteur a assez de solde
(ne touche pas aux signatures)
*/
function isTransactionEconomicallyValid(tx, balances) {
  // Une transaction MINT crée de la monnaie → toujours valide
  if (isMintTransaction(tx)) return true;

  // Sinon, il faut avoir le solde suffisant
  return (balances[tx.from] || 0) >= tx.amount;
}

// Tant que la synchro initiale n’est pas finie,
// on refuse tout nouveau bloc
let isSyncing = true;

/*
════════════════════════════════════════
B. Transactions (exemple simplifié)
════════════════════════════════════════
*/

function hashTransaction(tx) {
  return crypto
    .createHash("sha256")
    .update(tx.from + tx.to + tx.amount + tx.timestamp)
    .digest(); // Uint8Array
}

function verifyTransaction(tx) {
  if (!tx.signature || !tx.from) return false;

  try {
    return secp256k1.verify(
      hexToBytes(tx.signature),
      hashTransaction(tx),
      hexToBytes(tx.from),
    );
  } catch {
    return false;
  }
}

/*
════════════════════════════════════════
C. FORGE D’UN BLOC (MASTER UNIQUEMENT)
════════════════════════════════════════
Le master :
- prend des transactions du mempool
- crée un bloc
- le signe
*/

function forgeBlock() {
  // Sécurité : seul le master forge
  if (nodeID !== "node1") return;

  // Pas de transactions → pas de bloc
  if (mempool.length === 0) {
    console.log(`[${nodeID}] ⏸️ Mempool vide, rien à forger`);
    return;
  }

  const lastBlock = blockchain[blockchain.length - 1];

  // On prend TOUT le mempool (simple et volontaire)
  const transactions = [...mempool];

  const block = {
    index: lastBlock.index + 1,
    previousHash: lastBlock.hash,
    timestamp: Date.now(),
    data: {
      transactions,
    },
  };

  // Hash structurel
  block.hash = calculateHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data,
  );

  // Signature par le master
  block.signature = signBlock(block, privateKey);
  block.signer = publicKey;
  /*
      ════════════════════════════════════════
      NETTOYAGE DU MEMPOOL
      ════════════════════════════════════════
      Quand un bloc est accepté, toutes les transactions
      qu’il contient ne doivent plus rester en attente.

      Sinon un node pourrait :
      - garder des transactions déjà confirmées
      - tenter de les remettre dans un futur bloc
      - créer des doublons logiques

      Règle :
      confirmed tx → supprimée du mempool
      */

  const confirmedIds = new Set(block.data.transactions.map((tx) => tx.id));

  mempool = mempool.filter((tx) => !confirmedIds.has(tx.id));

  // Ajout local
  blockchain.push(block);

// Ajout local
blockchain.push(block);

// Application aux soldes
for (const tx of block.data.transactions) {
  applyTransaction(tx, balances);
}

// Nettoyage du mempool
mempool = mempool.filter((tx) => !confirmedIds.has(tx.id));

console.log(`[${nodeID}] ⛏️ Bloc forgé (#${block.index})`);


  // Diffusion aux peers
  peers.forEach((peer) =>
    sendMessage(peer, {
      type: "NEW_BLOCK",
      from: nodeID,
      block,
    }),
  );
}
// Forge un bloc toutes les 20 secondes

/*
════════════════════════════════════════
D. IDENTIFIANT DE TRANSACTION
════════════════════════════════════════
- Déterministe
- Identique sur tous les nœuds
- Sert de clé logique dans le mempool
*/

function createTransactionId(tx) {
  return crypto
    .createHash("sha256")
    .update(tx.from + tx.to + tx.amount + tx.timestamp)
    .digest("hex");
}

/*
════════════════════════════════════════
2. CRYPTOGRAPHIE
════════════════════════════════════════
Séparation volontaire :
- hash structurel (lisible, hex)
- hash cryptographique (signature, Uint8Array)
*/

// Hash stocké dans la blockchain (chaînage)
function calculateHash(index, previousHash, timestamp, data) {
  return crypto
    .createHash("sha256")
    .update(index + previousHash + timestamp + JSON.stringify(data))
    .digest("hex");
}

// Hash utilisé UNIQUEMENT pour la signature
// noble exige un Uint8Array
function hashBlockForSignature(block) {
  return crypto
    .createHash("sha256")
    .update(
      block.index +
        block.previousHash +
        block.timestamp +
        JSON.stringify(block.data),
    )
    .digest(); // Buffer == Uint8Array
}

// Signature ECDSA secp256k1 (MASTER seulement)
function signBlock(block, privateKeyHex) {
  const msgHash = hashBlockForSignature(block);
  const keyBytes = hexToBytes(privateKeyHex);
  const signature = secp256k1.sign(msgHash, keyBytes);

  // On stocke la signature en hex (transport / JSON)
  return Buffer.from(signature).toString("hex");
}

// Vérification de signature d’un bloc
function verifyBlockSignature(block) {
  if (!block.signature || !block.signer) return false;
  // Seul le master est autorisé à signer des blocs
  if (block.signer !== process.env.NODE1_PUBLIC_KEY) return false;

  try {
    return secp256k1.verify(
      hexToBytes(block.signature),
      hashBlockForSignature(block),
      hexToBytes(block.signer),
    );
  } catch {
    return false;
  }
}

/*
════════════════════════════════════════
3. GENESIS BLOCK
════════════════════════════════════════
- Identique pour tous
- Signé UNIQUEMENT par le master
*/

function createGenesisBlock() {
  const timestamp = "2024-01-01";
  const data = { message: "Genesis Block - Buyabuya" };

  return {
    index: 0,
    previousHash: "0",
    timestamp,
    data,
    hash: calculateHash(0, "0", timestamp, data),
  };
}

// Le master crée et signe le Genesis
if (nodeID === "node1") {
  const genesis = createGenesisBlock();
  genesis.signature = signBlock(genesis, privateKey);
  genesis.signer = publicKey;

  blockchain.push(genesis);
  console.log(`[${nodeID}] 🧱 Genesis créé`);
} else {
  // Les autres nœuds attendent la synchro réseau
  console.log(`[${nodeID}] ⏳ En attente de synchronisation`);
}

/*
════════════════════════════════════════
4. VALIDATION DE CHAÎNE
════════════════════════════════════════
Utilisée lors de la synchronisation
*/

function isValidChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return false;

  // Vérification stricte du Genesis
  const expectedGenesis = createGenesisBlock();
  const g = chain[0];

  if (
    g.index !== expectedGenesis.index ||
    g.previousHash !== expectedGenesis.previousHash ||
    g.hash !== expectedGenesis.hash
  ) {
    return false;
  }

  // Le Genesis doit être signé correctement
  if (!verifyBlockSignature(g)) return false;

  // Vérification des blocs suivants
  for (let i = 1; i < chain.length; i++) {
    const cur = chain[i];
    const prev = chain[i - 1];

    if (cur.index !== prev.index + 1) return false;
    if (cur.previousHash !== prev.hash) return false;

    const hash = calculateHash(
      cur.index,
      cur.previousHash,
      cur.timestamp,
      cur.data,
    );

    if (hash !== cur.hash) return false;
    if (!verifyBlockSignature(cur)) return false;
  }

  return true;
}

// Règle simple : chaîne la plus longue gagne
function chooseBestChain(local, incoming) {
  if (incoming.length > local.length) return incoming;
  return local;
}

/*
════════════════════════════════════════
5. CLIENT TCP
════════════════════════════════════════
Utilisé pour envoyer des messages
et recevoir les réponses
*/

function sendMessage(target, message) {
  const client = net.createConnection({ host: target, port: 5000 }, () => {
    client.write(JSON.stringify(message));
  });

  client.on("data", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(msg);
    } catch {}
    client.end();
  });

  client.on("error", () => {});
}

/*
════════════════════════════════════════
6. ROUTEUR DE MESSAGES
════════════════════════════════════════
Toute la logique réseau est centralisée ici
*/

function handleMessage(msg, socket = null) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    // Un peer demande notre blockchain
    case "GET_CHAIN":
      if (!blockchain.length) return;

      socket?.write(
        JSON.stringify({
          type: "FULL_CHAIN",
          from: nodeID,
          chain: blockchain,
        }),
      );
      break;

    // Réception d’une blockchain complète
    case "FULL_CHAIN":
      console.log(`[${nodeID}] 📥 Chaîne reçue de ${msg.from}`);

      if (!isValidChain(msg.chain)) {
        console.log(`[${nodeID}] ❌ Chaîne invalide`);
        return;
      }

      blockchain = chooseBestChain(blockchain, msg.chain);
      isSyncing = false;

      console.log(`[${nodeID}] 🟢 Synchronisation terminée`);
      bootstrapMoney();
      break;

    // Réception d’un nouveau bloc
    case "NEW_BLOCK": {
      if (isSyncing) return;

      const block = msg.block;
      const last = blockchain[blockchain.length - 1];

      if (block.index !== last.index + 1 || block.previousHash !== last.hash)
        return;

      const hash = calculateHash(
        block.index,
        block.previousHash,
        block.timestamp,
        block.data,
      );

      if (hash !== block.hash) return;
      if (!verifyBlockSignature(block)) return;

      // NOTE: plus tard, il faudra retirer du mempool
      // les transactions incluses dans ce bloc

      blockchain.push(block);
      /*
═══════════════════════════════════════
NETTOYAGE DU MEMPOOL (FOLLOWERS)
═══════════════════════════════════════
Quand un bloc arrive du réseau,
toutes ses transactions deviennent confirmées.

Donc on doit les retirer du mempool local.
*/

const confirmedIds = new Set(
  block.data.transactions.map((tx) => tx.id)
);

mempool = mempool.filter((tx) => !confirmedIds.has(tx.id));


      // Application des transactions du bloc aux soldes
      for (const tx of block.data.transactions) {
        applyTransaction(tx, balances);
      }

      console.log(`[${nodeID}] ➕ Bloc ajouté`);
      break;
    }

    // Réception d’une nouvelle transaction

    case "NEW_TX": {
      const tx = msg.tx;

      // 1. Vérification cryptographique
      if (!verifyTransaction(tx)) {
        console.log(`[${nodeID}] ❌ Transaction invalide`);
        return;
      }

      // Vérification économique
      if (!isTransactionEconomicallyValid(tx, balances)) {
        console.log(`[${nodeID}] ❌ Solde insuffisant pour la transaction`);
        return;
      }

      // 2. Création de l’identifiant canonique
      if (!tx.id) {
        tx.id = createTransactionId(tx);
      }

      // 3. Anti-doublon (par ID uniquement)
      if (mempool.find((t) => t.id === tx.id)) {
        return;
      }

      // 4. Ajout au mempool
      mempool.push(tx);
      console.log(`[${nodeID}] 💸 Transaction acceptée (${mempool.length})`);

      // 5. Propagation réseau
      peers.forEach((peer) =>
        sendMessage(peer, {
          type: "NEW_TX",
          from: nodeID,
          tx,
        }),
      );

      break;
    }
  }
}

/*
════════════════════════════════════════
7. SERVEUR TCP
════════════════════════════════════════
*/

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(msg, socket);
    } catch {}
  });
});

/*
════════════════════════════════════════
8. DÉMARRAGE & SYNCHRO INITIALE
════════════════════════════════════════
*/

server.listen(5000, () => {
  console.log(`[${nodeID}] 🟢 Serveur actif`);

  // Synchronisation au démarrage
  setTimeout(() => {
    console.log(`[${nodeID}] 🔄 Sync au démarrage`);
    peers.forEach((peer) =>
      sendMessage(peer, { type: "GET_CHAIN", from: nodeID }),
    );
  }, 1500);

  // Le master forge un bloc toutes les 20 secondes

  if (nodeID === "node1") {
    setInterval(() => {
      forgeBlock();
    }, 20000); // toutes les 20 secondes
  }
});
