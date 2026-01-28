import crypto from "crypto";
import net from "net";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";

/*
────────────────────────────────────────
0. CONFIGURATION DU NŒUD
────────────────────────────────────────
*/
const nodeID = process.env.NODE_ID;

const privateKey = process.env.NODE1_PRIVATE_KEY;
const publicKey = process.env.NODE1_PUBLIC_KEY;

console.log(`--- DÉMARRAGE DU NOEUD ${nodeID} ---`);

/*
────────────────────────────────────────
1. ÉTAT LOCAL
────────────────────────────────────────
Chaque nœud possède sa copie locale
de la blockchain.
*/
let blockchain = [];

/*
────────────────────────────────────────
2. FONCTIONS CRYPTOGRAPHIQUES
────────────────────────────────────────
Ces fonctions ne dépendent PAS du réseau.
*/

/*
────────────────────────────────────────
HASH STRUCTUREL DU BLOC (lisible)
────────────────────────────────────────
→ utilisé pour chaîner les blocs
→ stocké dans la blockchain
→ format HEX volontairement
*/
function calculateHash(index, previousHash, timestamp, data) {
  return crypto
    .createHash("sha256")
    .update(index + previousHash + timestamp + JSON.stringify(data))
    .digest("hex");
}

/*
────────────────────────────────────────
HASH CRYPTO POUR SIGNATURE
────────────────────────────────────────
→ noble exige Uint8Array
→ JAMAIS de string ici
*/
function hashBlockForSignature(block) {
  return crypto
    .createHash("sha256")
    .update(
      block.index +
        block.previousHash +
        block.timestamp +
        JSON.stringify(block.data),
    )
    .digest(); // Buffer == Uint8Array ✅
}

/*
────────────────────────────────────────
SIGNATURE DU BLOC (MASTER)
────────────────────────────────────────
→ privateKeyHex DOIT être convertie
→ message = Uint8Array
→ clé = Uint8Array
*/
function signBlock(block, privateKeyHex) {
  const msgHash = hashBlockForSignature(block);
  const privateKeyBytes = hexToBytes(privateKeyHex);

  const signatureBytes = secp256k1.sign(msgHash, privateKeyBytes);

  // Uint8Array → hex string
  return Buffer.from(signatureBytes).toString("hex");
}

/*
────────────────────────────────────────
VÉRIFICATION DE LA SIGNATURE
────────────────────────────────────────
→ signature = hex
→ signer = clé publique hex
*/

function verifyBlockSignature(block) {
  if (!block.signature || !block.signer) return false;

  const msgHash = hashBlockForSignature(block);

  try {
    return secp256k1.verify(
      hexToBytes(block.signature), // ✅ Uint8Array
      msgHash,                     // ✅ Uint8Array
      hexToBytes(block.signer)     // ✅ Uint8Array
    );
  } catch {
    return false;
  }
}


/*
────────────────────────────────────────
3. BLOC GENESIS
────────────────────────────────────────
Bloc racine, identique sur tous les nœuds.
*/
function createGenesisBlock() {
  const timestamp = "2024-01-01";
  const data = { message: "Genesis Block - Naissance de la Buyabuya" };

  const hash = calculateHash(0, "0", timestamp, data);

  return {
    index: 0,
    previousHash: "0",
    timestamp,
    data,
    hash,
  };
}

/*
────────────────────────────────────────
4. INITIALISATION DE LA BLOCKCHAIN
────────────────────────────────────────
*/
const genesis = createGenesisBlock();

// Seul le MASTER signe le bloc Genesis
if (nodeID === "node1") {
  genesis.signature = signBlock(genesis, privateKey);
  genesis.signer = publicKey;
}

blockchain.push(genesis);

console.log(
  `[${nodeID}] Bloc Genesis créé : ${genesis.hash.substring(0, 10)}...`,
);

/*
────────────────────────────────────────
5. RÉSEAU : PEERS & ENVOI
────────────────────────────────────────
*/
const peers = ["node1", "node2", "node3"].filter((id) => id !== nodeID);

console.log(`[${nodeID}] Peers connus : ${peers.join(", ")}`);

function sendMessage(targetNode, message) {
  const client = net.createConnection({ host: targetNode, port: 5000 }, () => {
    console.log(`[${nodeID}] Connecté à ${targetNode}`);
    client.write(JSON.stringify(message));
    client.end();
  });

  client.on("error", () => {
    console.log(`[${nodeID}] Impossible de joindre ${targetNode}`);
  });
}

/*
────────────────────────────────────────
6. SERVEUR TCP
────────────────────────────────────────
Réception et validation des messages.
*/
const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      console.log(`[${nodeID}] ❌ Message invalide`);
      return;
    }

    // Réception d’un bloc
    if (msg.type === "NEW_BLOCK") {
      const block = msg.block;

      // 1. Vérification du hash structurel
      const recomputedHash = calculateHash(
        block.index,
        block.previousHash,
        block.timestamp,
        block.data,
      );

      if (recomputedHash !== block.hash) {
        console.log(`[${nodeID}] ❌ Hash invalide — bloc altéré`);
        return;
      }

      // 2. Vérification de la signature
      const isValid = verifyBlockSignature(block);

      if (!isValid) {
        console.log(`[${nodeID}] ❌ Bloc rejeté (signature invalide)`);
        return;
      }

      console.log(`[${nodeID}] ✅ Bloc valide reçu de ${msg.from}`);
    }
  });
});

/*
────────────────────────────────────────
7. DÉMARRAGE DU SERVEUR
────────────────────────────────────────
*/
server.listen(5000, () => {
  console.log(`[${nodeID}] Serveur d'écoute actif.`);

  if (nodeID === "node1" && !privateKey) {
    throw new Error("MASTER sans clé privée");
  }

  // Le MASTER diffuse le Genesis
  if (nodeID === "node1") {
    setTimeout(() => {
      peers.forEach((peer) => {
        console.log(`[${nodeID}] Envoi du Genesis à ${peer}`);
        sendMessage(peer, {
          type: "NEW_BLOCK",
          from: nodeID,
          block: genesis,
        });
      });
    }, 3000);
  }
});
