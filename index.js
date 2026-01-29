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

// Tant que la synchro initiale n’est pas finie,
// on refuse tout nouveau bloc
let isSyncing = true;

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
      break;

    // Réception d’un nouveau bloc
    case "NEW_BLOCK": {
      if (isSyncing) return;

      const block = msg.block;
      const last = blockchain[blockchain.length - 1];

      if (
        block.index !== last.index + 1 ||
        block.previousHash !== last.hash
      ) return;

      const hash = calculateHash(
        block.index,
        block.previousHash,
        block.timestamp,
        block.data,
      );

      if (hash !== block.hash) return;
      if (!verifyBlockSignature(block)) return;

      blockchain.push(block);
      console.log(`[${nodeID}] ➕ Bloc ajouté`);
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
});
