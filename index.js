import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
import crypto from "crypto";
import net from "net";
import tls from "tls";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import express from "express";
let logs = [];
// Pour indiquer que le nœud est en train de s’arrêter
let shuttingDown = false;

/*
════════════════════════════════════════
        General concept      
════════════════════════════════════════
*/

// Banque centrale : un seul node autorisé à forger et mint
// Tous les autres sont followers (validation + propagation)
// Elles ne conservent pas le file qui contient la Blokchain: master_chain.json

const MASTER_ID = process.env.MASTER_ID || "node1";
const WEB_PORT = parseInt(process.env.WEB_PORT || "3000");
const P2P_PORT = parseInt(process.env.P2P_PORT || "5000");  

const NETWORK_MODE = process.env.NETWORK_MODE || "docker";

/*
════════════════════════════════════════
Un des points les plus importants seront les logs.
On va beaucoup loger. 
════════════════════════════════════════
*/

function log(message) {
  const line = `[${nodeID}] ${message}`;
  console.log(line);

  logs.push(line);

  // limite à 30 lignes
  if (logs.length > 30) logs.shift();
}
/*
════════════════════════════════════════
 CONFIGURATION DU system de cryptage des communicatons
════════════════════════════════════════
Tls or not tls, that is the question.
tout est dans le dossier certs ignore par defaut par git.
Le nom du node doit toujours etre le meme malgré le fait que ce soit node2, node3...
Donc on a node.crt et node.key pour tous les nodes, mais avec des clés différentes à l’intérieur.
*/

const USE_TLS = process.env.USE_TLS === "true";

function getTLSOptions() {
  if (!USE_TLS) return null;

  return {
    cert: fs.readFileSync(`./certs/${nodeID}.crt`),
    key: fs.readFileSync(`./certs/${nodeID}.key`),
    ca: fs.readFileSync("./certs/ca.crt"),

    requestCert: true,
    rejectUnauthorized: true,
  };
}

/*
════════════════════════════════════════
 CONFIGURATION DU NŒUD
════════════════════════════════════════
Chaque conteneur définit NODE_ID
(node1 = master / node2, node3 = followers)  
*/

const nodeID = process.env.NODE_ID;
const privateKey = process.env[`NODE${nodeID.slice(-1)}_PRIVATE_KEY`];
const publicKey = process.env[`NODE${nodeID.slice(-1)}_PUBLIC_KEY`];

log(`\n--- DÉMARRAGE DU NŒUD ${nodeID} ---`);
log(`>> MODE = ${NETWORK_MODE}`);
log(`>> NODE_ID = ${nodeID}`);
log(`>> P2P_PORT = ${P2P_PORT}`);
log(`>> WEB_PORT = ${WEB_PORT}`);

/*
════════════════════════════════════════
 PEERS CONFIG (JSON)
════════════════════════════════════════
*/

const peersConfig = JSON.parse(fs.readFileSync("./peers.json", "utf-8"));

let peers = [];

// On enlève notre propre adresse IP:PORT pour éviter de se connecter à soi-même et provoquer un feu d'artifice.

if (NETWORK_MODE === "docker") {
  peers = peersConfig.peersDocker.filter((id) => id !== nodeID);
}

if (NETWORK_MODE === "ip") {
  peers = peersConfig.peersIP.filter((addr) => !addr.endsWith(":" + P2P_PORT));
}

log(`>> Peers chargés (${NETWORK_MODE}) : ${JSON.stringify(peers)}`);

/*
════════════════════════════════════════
     ÉTAT LOCAL
════════════════════════════════════════
Chaque nœud possède sa copie locale
de la blockchain.
*/
// Elle sera chargee depuis le disque si le fichier existe.
//pour DOcker: data-node1 ou en mode ip: data
let blockchain = [];

/*
════════════════════════════════════════
     POOL DE TRANSACTIONS
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
Et c'est tout! Les .changes d&informations seront fait sur la base de la clé Public. 
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

function renderBalances() {
  if (Object.keys(balances).length === 0) {
    return "<p>Aucun solde disponible.</p>";
  }

  return `
    <ul>
      ${Object.entries(balances)
        .map(
          ([key, val]) =>
            `<li><b>${key.slice(0, 12)}...</b> : ${val} Bouya</li>`,
        )
        .join("")}
    </ul>
  `;
}

/*
════════════════════════════════════════
      Système de messagerie éphémère
════════════════════════════════════════
- Messages temporaires pour les notifications
- Affichés dans le dashboard web et ne reste que 2 minutes
*/

const ephemeralInbox = [];
const MAIL_TTL = 2 * 60 * 1000; // 2 minutes

//Function de netoyage des messages expirés
setInterval(() => {
  const now = Date.now();
  while (
    ephemeralInbox.length > 0 &&
    now - ephemeralInbox[0].timestamp > MAIL_TTL
  ) {
    ephemeralInbox.shift();
  }
}, 10000);
// Fonction de déchiffrement des mails (placeholder)
function tryDecryptMail(packet) {
  try {
    const clear = decryptPayload(packet.payload);
    return clear;
  } catch (e) {
    log(`❌ Erreur de déchiffrement du mail: ${e.message}`);
    return null;
  }
}
// SendMail Functioon
function sendMail(toPubKey, text) {
  const clearPacket = {
    from: publicKey,
    text,
    timestamp: Date.now(),
  };

  const encryptedPayload = encryptForRecipient(toPubKey, clearPacket);

  broadcast({
    type: "MAIL",
    payload: encryptedPayload,
  });

  log("📤 Mail envoyé (éphémère)");
}
// Render mail ephemere
function renderInbox() {
  if (ephemeralInbox.length === 0) {
    return "<p>Aucun message.</p>";
  }

  return `
    <ul>
      ${ephemeralInbox
        .map(
          (m) => `
        <li>
          <b>From:</b> ${m.from.slice(0, 20)}...<br>
          <b>Msg:</b> ${m.text}
        </li>
      `,
        )
        .join("")}
    </ul>
  `;
}

function deriveSharedSecret(myPrivKeyHex, theirPubKeyHex) {
  const priv = Buffer.from(myPrivKeyHex, "hex");
  const pub = Buffer.from(theirPubKeyHex, "hex");

  const shared = secp256k1.getSharedSecret(priv, pub, true);

  // On hash pour obtenir une clé AES 32 bytes
  return crypto.createHash("sha256").update(shared).digest();
}

function encryptForRecipient(toPubKeyHex, obj) {
  const key = deriveSharedSecret(privateKey, toPubKeyHex);

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = Buffer.from(JSON.stringify(obj));

  let encrypted = cipher.update(plaintext);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptPayload(payloadB64) {
  const data = Buffer.from(payloadB64, "base64");

  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);

  // Ici on ne connaît pas l’expéditeur → on tente avec tous les pubs connus
  for (const senderPub of getKnownAddresses()) {
    try {
      const key = deriveSharedSecret(privateKey, senderPub);

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return JSON.parse(decrypted.toString());
    } catch {}
  }

  throw new Error("Not for me");
}

function broadcast(message) {
  if (shuttingDown) return;
  peers
    .filter((p) => p !== nodeID)
    .forEach((peer) => {
      sendMessage(peer, message);
    });
}

/*
════════════════════════════════════════
      TRANSACTION SPÉCIALE : MINT
════════════════════════════════════════
- Seul node1 a le droit de créer de la monnaie
- Pas de signature requise
- Node1 crée la monnaie après démarrage
- Puis distribue aux autres nodes
- Ne touche pas au Genesis
*/

function isMintTransaction(tx) {
  return tx.from === "MINT";
}

let bootstrapDone = false;

function bootstrapMoney() {
  if (bootstrapDone) return;

  // Seul node1 a le droit de Minter
  if (nodeID !== MASTER_ID) return;
  // SÉCURITÉ : Si aucun mouvement, on ne crée pas de bloc inutile

  // ✅ Ne jamais remint si déjà fait
  // ✅ Si déjà bootstrappé → stop
  if (fs.existsSync("./data/bootstrap_done.flag")) {
    log(">> ⚠️ Bootstrap déjà effectué → No mint today...");
    bootstrapDone = true;
    return;
  }

  log(`>> 🪙 Bootstrapping Bouya-Bouya...`);

  // 1) Mint initial
  const mintTx = {
    from: "MINT",
    to: publicKey,
    amount: 1000,
    timestamp: Date.now(),
    signature: null,
  };

  mintTx.id = createTransactionId(mintTx);
  log(">> BOOTSTRAP START");

  log("Blockchain length = " + blockchain.length);
  log("Mempool length before = " + mempool.length);
  mempool.push(mintTx);
  log("Mempool length after = " + mempool.length);
  log(`>> ✅ Mint ajouté au mempool (${mempool.length} tx`);
  // FORCE LE PREMIER BLOC IMMÉDIATEMENT
  log(`>> ⛏️ Forgeage immédiat du bloc de bootstrap...`);
  forgeBlock();
  log("ForgeBlock called");
  bootstrapDone = true;

  // ✅ Marqueur permanent

  if (blockchain.length > 1) {
    fs.writeFileSync("./data/bootstrap_done.flag", "done");
    log("✅ Bootstrap terminé avec succès");
  }
}

/*
Applique une transaction aux soldes
⚠️ suppose que la transaction est valide
*/
function applyTransaction(tx, balances) {
  // Cas spécial : création monétaire
  if (isMintTransaction(tx)) {
    balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
    log(`>> [Balance] MINT de ${tx.amount} pour ${tx.to.slice(0, 10)}...`);
    return;
  }

  // Cas normal : transfert
  balances[tx.from] = (balances[tx.from] || 0) - tx.amount;
  balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
  log(
    `>> [Balance] Transfert: ${tx.from.slice(0, 12)}... -> ${tx.to.slice(0, 12)}... (${tx.amount})`,
  );
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
       Transactions Actions
════════════════════════════════════════
*/

// ⚠️ L'id n'est pas inclus dans le hash signé.
// Donc la signature couvre uniquement (from,to,amount,timestamp).
// C’est OK, mais il faut rester cohérent partout.

function hashTransaction(tx) {
  return crypto
    .createHash("sha256")
    .update(tx.from + tx.to + tx.amount + tx.timestamp)
    .digest(); // Uint8Array
}

function signTransaction(tx, privateKeyHex) {
  const msgHash = hashTransaction(tx);
  const keyBytes = hexToBytes(privateKeyHex);
  const signature = secp256k1.sign(msgHash, keyBytes);

  // Stockage en hex pour JSON
  return Buffer.from(signature).toString("hex");
}

log(">> Public key length = " + publicKey.length);

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
       FORGE D’UN BLOC (MASTER)
════════════════════════════════════════
Le master :
- prend des transactions du mempool
- crée un bloc
- le signe
*/

function saveBlockchain() {
  fs.writeFileSync(
    "./data/master_chain.json",
    JSON.stringify(blockchain, null, 2),
  );

  log(">> 💾 Blockchain sauvegardée ");
}

function forgeBlock() {
  // Sécurité : seul le master forge
  if (nodeID !== MASTER_ID) return;

  // Pas de transactions → pas de bloc
  if (mempool.length === 0) {
    log(`>> ⏸️ Mempool vide, rien à forger`);
    return;
  }
  log(`>> ⛏️ Forgeage en cours...`);

  log("FORGEBLOCK ENTERED");

  log("nodeID=" + nodeID);
  log("MASTER_ID=" + MASTER_ID);
  log("mempool=" + mempool.length);
  log("blockchain=" + blockchain.length);

  const lastBlock = blockchain[blockchain.length - 1];

  if (!lastBlock) {
    log("❌ Aucun bloc Genesis présent → forge impossible");
    return;
  }

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
  // Ajout local
  blockchain.push(block);

  // sauvegarde immédiate
  saveBlockchain();

  // Application aux soldes
  for (const tx of block.data.transactions) {
    applyTransaction(tx, balances);
  }

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

  log(`>> ✅ Bloc #${block.index} forgé et ajouté à la chaîne localement`);

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
       IDENTIFIANT DE TRANSACTION
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
       CRYPTOGRAPHIE
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
     GENESIS BLOCK
════════════════════════════════════════
- Identique pour tous
- Signé UNIQUEMENT par le master
*/

function createGenesisBlock() {
  const timestamp = "2024-01-01"; //Date.parse("2024-01-01");
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
if (nodeID === MASTER_ID) {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  if (fs.existsSync("./data/master_chain.json")) {
    blockchain = JSON.parse(fs.readFileSync("./data/master_chain.json"));
    log(">> 📂 Blockchain master rechargée depuis disque");
    // ✅ Soldes reconstruits
    recalculateBalances();
    // ✅ Master prêt
    isSyncing = false;
  } else {
    const genesis = createGenesisBlock();
    genesis.signature = signBlock(genesis, privateKey);
    genesis.signer = publicKey;

    blockchain.push(genesis);
    log(">> 🧱 Genesis créé");

    // ✅ Init balances
    recalculateBalances();
    isSyncing = false;
  }
} else {
  // Les autres nœuds attendent la synchro réseau
  log(`>> ⏳ En attente de synchronisation`);
}

/*
════════════════════════════════════════
      VALIDATION DE CHAÎNE
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

function recalculateBalances() {
  const newBalances = {};

  blockchain.forEach((block) => {
    if (block.data && block.data.transactions) {
      block.data.transactions.forEach((tx) => {
        applyTransaction(tx, newBalances);
      });
    }
  });

  balances = newBalances;
  log(
    `>> 💰 Soldes recalculés : ${Object.keys(balances).length} comptes trouvés.`,
  );
}

/*
════════════════════════════════════════
      CLIENT TCP
════════════════════════════════════════
Utilisé pour envoyer des messages
et recevoir les réponses
*/

// ==========================================
// ✅ TCP FRAMING HELPERS (Bouya-Bouya Core)
// ==========================================
//
// Tous les messages sont envoyés sous forme :
//
//   [4 bytes longueur][payload JSON]
//
// Cela rend le réseau robuste :
// - JSON jamais coupé
// - multi-messages supportés
// - gros blocs OK
//

function sendFramed(socket, obj) {
  const json = JSON.stringify(obj);
  const body = Buffer.from(json);

  // Header fixe : taille du message
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);

  // Envoi : header + payload
  socket.write(Buffer.concat([header, body]));
}

function sendMessage(target, message) {
  let host = target;
  let port = P2P_PORT;

  // Mode IP : "192.168.0.112:5000"
  if (target.includes(":")) {
    [host, port] = target.split(":");
    port = parseInt(port);
  }

  log("Sending message to " + target);
  log("Using port " + port);

  // ============================
  // TCP ou TLS selon USE_TLS
  // ============================
  //const tlsOptions = getTLSOptions();

  const client = USE_TLS
    ? tls.connect(
        {
          host,
          port,
          ca: fs.readFileSync("certs/ca.crt"),
          cert: fs.readFileSync(`certs/${nodeID}.crt`),
          key: fs.readFileSync(`certs/${nodeID}.key`),
          rejectUnauthorized: true,
        },
        () => {
          log(`🔐 TLS connecté → ${host}:${port}`);
          sendFramed(client, message);
        },
      )
    : net.createConnection({ host, port }, () => {
        log(`🔌 TCP connecté → ${host}:${port}`);
        sendFramed(client, message);
      });

  client.on("error", (err) => {
    log(`❌ Connection error → ${host}:${port}: ${err.message}`);
  });
  // ============================
  // Réception bufferisée
  // ============================

  let buffer = Buffer.alloc(0);
  client.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    log(`>> 📤 data traitées pour ${host}:${port}`);

    while (buffer.length >= 4) {
      const msgLength = buffer.readUInt32BE(0);

      if (buffer.length < 4 + msgLength) break;

      const body = buffer.slice(4, 4 + msgLength);
      buffer = buffer.slice(4 + msgLength);

      try {
        const msg = JSON.parse(body.toString());
        handleMessage(msg);
      } catch (err) {
        log("Erreur JSON:", err);
      }
      client.end(); ///A supprimer dans le futur pour permettre les échanges plus longs et persistants, mais pour l'instant on ferme la connexion après réception du message, comme dans l'exemple précédent
    }
  });

  client.on("error", (err) => {
    log(`>> ❌ Erreur TCP vers ${host}:${port} : ${err.message}`);
  });
}

function txAlreadyInChain(txid) {
  return blockchain.some((b) =>
    b.data?.transactions?.some((t) => t.id === txid),
  );
}

/*
════════════════════════════════════════
       ROUTEUR DE MESSAGES
════════════════════════════════════════
Toute la logique réseau est centralisée ici
*/

function handleMessage(msg, socket = null) {
  if (!msg || !msg.type) return;

  try {
    switch (msg.type) {
      // Un peer demande notre blockchain
      case "GET_CHAIN":
        if (!blockchain.length) return;

        sendFramed(socket, {
          type: "FULL_CHAIN",
          from: nodeID,
          chain: blockchain,
        });

        // socket.end(); // ✅ IMPORTANT: on ferme la connexion après envoi
        break;

      // Demande partielle : "Donne-moi les blocs après un index"
      case "GET_BLOCKS_FROM": {
        if (!blockchain.length) return;

        const startIndex = msg.index + 1;

        log(`>> 📤 GET_BLOCKS_FROM reçu → envoi blocs depuis #${startIndex}`);

        const missingBlocks = blockchain.slice(startIndex);

        sendFramed(socket, {
          type: "BLOCKS",
          from: nodeID,
          blocks: missingBlocks,
        });
        //socket.end();
        break;
      }
      // Réception d’une liste de blocs manquants
      case "BLOCKS": {
        log(`>> 📥 ${msg.blocks.length} blocs reçus (sync incrémental)`);

        for (const block of msg.blocks) {
          const last = blockchain[blockchain.length - 1];

          // Vérification chaînage
          if (block.previousHash !== last.hash) {
            log(">> ❌ Chaîne cassée → resync FULL_CHAIN nécessaire");
            return;
          }

          // Vérification hash
          const hash = calculateHash(
            block.index,
            block.previousHash,
            block.timestamp,
            block.data,
          );

          if (hash !== block.hash) {
            log(">> ❌ Hash invalide → bloc rejeté");
            return;
          }

          // Vérification Proof of Authority
          if (!verifyBlockSignature(block)) {
            log(">> ❌ Bloc rejeté : signature non autorisée");
            return;
          }

          // Ajout bloc
          blockchain.push(block);

          // Application des transactions
          if (block.data?.transactions) {
            block.data.transactions.forEach((tx) =>
              applyTransaction(tx, balances),
            );
          }

          log(`>> ✅ Bloc #${block.index} ajouté via rattrapage`);
        }

        log(">> 🟢 Sync incrémental terminé");
        //socket.end();
        break;
      }
      // Réception d’une blockchain complète
      case "FULL_CHAIN":
        log(
          `>> 📥 Chaîne reçue de ${msg.from} (Taille : ${msg.chain.length} blocs)`,
        );

        if (msg.chain.length > 0) {
          const firstBlock = msg.chain[0];
          const lastBlock = msg.chain[msg.chain.length - 1];
          log(
            `>> [Vérification] Index 0 hash: ${firstBlock.hash?.slice(0, 10)}...`,
          );
          log(
            `>> [Vérification] Dernier index: ${lastBlock.index} (Hash: ${lastBlock.hash?.slice(0, 10)}...)`,
          );
        }

        if (!isValidChain(msg.chain)) {
          log(`>> ❌ Chaîne invalide ou corrompue !`);
          return;
        }

        blockchain = chooseBestChain(blockchain, msg.chain);

        // RECALCUL DES SOLDES après synchro
        recalculateBalances();

        isSyncing = false;
        log(`>> 🟢 Synchronisation terminée et soldes mis à jour`);
        //socket.end();
        break;
      // Réception d’un nouveau bloc
      case "NEW_BLOCK": {
        if (isSyncing) return;

        const block = msg.block;
        const last = blockchain[blockchain.length - 1];
        if (!last) return;

        // 🚨 Bloc en avance → il manque un maillon
        if (block.index > last.index + 1) {
          log(
            `>> ⚠️ Bloc reçu trop loin (#${block.index}), je suis à #${last.index}`,
          );

          // Demande des blocs manquants
          peers.forEach((peer) =>
            sendMessage(peer, {
              type: "GET_BLOCKS_FROM",
              from: nodeID,
              index: last.index,
            }),
          );

          return;
        }

        // Bloc déjà connu ou trop vieux
        if (block.index <= last.index) return;

        // Bloc normal attendu
        if (block.previousHash !== last.hash) return;

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

        // CRUCIAL : Mettre à jour les soldes avec les transactions du nouveau bloc
        if (block.data && block.data.transactions) {
          block.data.transactions.forEach((tx) => {
            applyTransaction(tx, balances);
          });
          log(`>> 💰 Soldes mis à jour après le bloc #${block.index}`);
        }

        /*
═══════════════════════════════════════
      NETTOYAGE DU MEMPOOL (FOLLOWERS)
═══════════════════════════════════════
Quand un bloc arrive du réseau,
toutes ses transactions deviennent confirmées.

Donc on doit les retirer du mempool local.
*/

        const confirmedIds = new Set(
          block.data.transactions.map((tx) => tx.id),
        );

        mempool = mempool.filter((tx) => !confirmedIds.has(tx.id));

        // Application des transactions du bloc aux soldes
        // for (const tx of block.data.transactions) { applyTransaction(tx, balances);}

        log(`>> ➕ Bloc ajouté`);
        // socket.end();
        break;
      }
      // Réception d’une nouvelle transaction
      case "NEW_TX": {
        const tx = msg.tx;
        if (txAlreadyInChain(tx.id)) return;
        if (!tx) {
          log(">> ❌ ERREUR : Message NEW_TX reçu sans objet transaction");
          return;
        }
        log(
          `>> 💸 Tentative TX: From ${tx.from?.slice(0, 8)} To ${tx.to?.slice(0, 8)} Amount: ${tx.amount}`,
        );

        // 1. Vérification cryptographique
        if (!verifyTransaction(tx)) {
          log(`>> ❌ Transaction invalide`);
          return;
        }

        // Vérification économique
        if (!isTransactionEconomicallyValid(tx, balances)) {
          log(`>> ❌ Solde insuffisant pour la transaction`);
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
        log(`>> 💸 Transaction acceptée (${mempool.length})`);

        // 5. Propagation réseau
        peers.forEach((peer) =>
          sendMessage(peer, {
            type: "NEW_TX",
            from: nodeID,
            tx,
          }),
        );
        //socket.end();

        break;
      }
      case "MAIL": {
        log(">>📩 Packet MAIL reçu");
        const decrypted = tryDecryptMail(msg);

        if (!decrypted) {
          // Pas pour moi → on ignore
          return;
        }
        log("✅ Mail déchiffré !");
        log(`📨 Message: ${decrypted.text}`);
        ephemeralInbox.push({
          from: decrypted.from,
          text: decrypted.text,
          timestamp: Date.now(),
        });
        log("📩 Nouveau mail reçu !");
        // socket.end();
        return;
      }
    }
  } catch (err) {
    log("Erreur handleMessage:", err);
    socket.end(); ///////////////////////////////////////////////////////////////
  } finally {
    if (socket && !socket.destroyed) {
      socket.end(); ///////////////////////////////////////////////////////////////
    }
  }
}

/*
════════════════════════════════════════
      SERVEUR TCP ou TLS
════════════════════════════════════════
*/
let connectionCount = 0;
const sockets = new Set();
//const server = net.createServer((socket) => {
function onConnection(socket) {
  connectionCount++;
  sockets.add(socket);

  log(`🔌 Nouvelle connexion`);
  log(`📌 Total connexions depuis démarrage: ${connectionCount}`);
  log(`🟢 Connexions actives: ${sockets.size}`);
  /////////////////////////////////
  // 📩 Réception de données
  // ==========================================
  // ✅ Réception robuste (buffer + while)
  // ==========================================

  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    // TCP = flux → on accumule
    buffer = Buffer.concat([buffer, chunk]);

    // Tant qu'on peut extraire un message complet
    while (buffer.length >= 4) {
      // Lire longueur
      const msgLength = buffer.readUInt32BE(0);

      // Message incomplet → attendre chunk suivant
      if (buffer.length < 4 + msgLength) break;

      // Extraire payload JSON
      const body = buffer.slice(4, 4 + msgLength);

      // Retirer du buffer
      buffer = buffer.slice(4 + msgLength);

      // Parser le message complet
      try {
        const msg = JSON.parse(body.toString());
        handleMessage(msg, socket);
      } catch (err) {
        log("❌ Message JSON corrompu reçu");
      }
    }
  });

  // 🔒 Gestion de la fermeture de connexion
  socket.on("close", () => {
    sockets.delete(socket);
    log(`❌ Connexion fermée → actives: ${sockets.size}`);
  });

  // 📴 Fin propre
  socket.on("end", () => {
    log("📴 Connexion terminée (end)");
  });

  socket.on("close", () => {
    sockets.delete(socket);
    log("❌ Connexion fermée");
  });

  // ⚠️ Erreur réseau
  socket.on("error", (err) => {
    log(`>> ❌ Erreur de connexion (Socket) : ${err.message}`);
  });
}
//);

function startP2PServer() {
  const tlsOptions = getTLSOptions();

  const server = USE_TLS
    ? tls.createServer(tlsOptions, onConnection)
    : net.createServer(onConnection);
  if (USE_TLS) {
    log(">> 🔐 Serveur TLS configuré");
  } else {
    log(">> 🔌 Serveur TCP configuré");
  }
  //////////////////////////////////////////////////////////////////
  return server;
}

/*
════════════════════════════════════════
      DÉMARRAGE & SYNCHRO INITIALE
════════════════════════════════════════
*/

const server = startP2PServer();

switch (NETWORK_MODE) {
  // En mode IP, on écoute sur toutes les interfaces réseau
  // pour permettre aux autres PC du LAN de se connecter

  case "docker":
    server.listen(P2P_PORT, () => {
      log(`>> 🟢 Serveur Docker P2P actif sur port ${P2P_PORT}`);
      startNode();
    });
    break;

  case "ip":
    server.listen(P2P_PORT, "0.0.0.0", () => {
      log(`>> 🟢 Serveur IP P2P actif sur port ${P2P_PORT}`);
      startNode();
    });
    break;

  default:
    server.listen(P2P_PORT, () => {
      log(`>> 🟢 Serveur Default P2P actif sur port ${P2P_PORT}`);
      startNode();
    });
}

/*
════════════════════════════════════════  
9. DASHBOARD WEB (EXPRESS)
════════════════════════════════════════
*/

let started = false;

let syncTimeout = null;
let bootstrapTimeout = null;

let forgeInterval = null;
let followerInterval = null;

function startNode() {
  if (started) return;
  started = true;

  // Sync initiale
  syncTimeout = setTimeout(() => {
    log(">> 🔄 Sync au démarrage");

    peers.forEach((peer) =>
      sendMessage(peer, { type: "GET_CHAIN", from: nodeID }),
    );
  }, 10000);

  // MASTER
  if (nodeID === MASTER_ID) {
    bootstrapTimeout = setTimeout(() => {
      bootstrapMoney();
    }, 15000);

    forgeInterval = setInterval(() => {
      forgeBlock();
    }, 14000);
  }

  // FOLLOWER
  else {
    followerInterval = setInterval(() => {
      log(">> 🔍 Check incrémental...");

      const lastIndex = blockchain.length
        ? blockchain[blockchain.length - 1].index
        : 0;

      peers.forEach((peer) =>
        sendMessage(peer, {
          type: "GET_BLOCKS_FROM",
          from: nodeID,
          index: lastIndex,
        }),
      );
    }, 20000);
  }
}

const app = express();
app.use(express.urlencoded({ extended: true }));

function renderNodeAddress() {
  return `
    <div class="addr">
      <p><b>Adresse du node :</b></p>
      <code>${publicKey}</code>
    </div>
  `;
}

function renderLastBlocks(limit = 5) {
  const recent = blockchain.slice(-limit).reverse();

  return `
    <ul>
      ${recent
        .map(
          (b) => `
        <li>
          <b>#${b.index}</b>
          — Hash: ${b.hash.slice(0, 12)}...
        </li>
      `,
        )
        .join("")}
    </ul>
  `;
}

function renderLastTransactions(limit = 5) {
  let allTx = [];

  blockchain.forEach((block) => {
    if (block.data?.transactions) {
      allTx.push(...block.data.transactions);
    }
  });

  const recentTx = allTx.slice(-limit).reverse();

  if (recentTx.length === 0) {
    return "<p>Aucune transaction confirmée.</p>";
  }

  return `
    <ul>
      ${recentTx
        .map(
          (tx) => `
        <li>
          ${tx.amount} Bouya —
          <span>${tx.from === "MINT" ? "🪙 MINT" : tx.from.slice(0, 12) + "..."}</span>
          →
          <span>${tx.to.slice(0, 12)}...</span>
        </li>
      `,
        )
        .join("")}
    </ul>
  `;
}

function getWalletActivity() {
  let stats = {};

  blockchain.forEach((block) => {
    block.data?.transactions?.forEach((tx) => {
      if (tx.from !== "MINT") {
        stats[tx.from] = (stats[tx.from] || 0) + 1;
      }
      stats[tx.to] = (stats[tx.to] || 0) + 1;
    });
  });

  return stats;
}

function getWealthChartData() {
  const entries = Object.entries(balances);

  if (entries.length === 0) {
    return { labels: [], values: [] };
  }

  const total = entries.reduce((sum, [_, amount]) => sum + amount, 0);

  const labels = entries.map(([addr]) => addr.slice(0, 12) + "...");
  const values = entries.map(([_, amount]) =>
    ((amount / total) * 100).toFixed(1),
  );

  return { labels, values };
}

function getSpendingChartData(wallet) {
  let spendingPerDay = {};

  blockchain.forEach((block) => {
    block.data?.transactions?.forEach((tx) => {
      if (tx.from === wallet && tx.from !== "MINT") {
        // Jour lisible
        const day = new Date(tx.timestamp).toISOString().slice(0, 10);

        spendingPerDay[day] = (spendingPerDay[day] || 0) + tx.amount;
      }
    });
  });

  // Trier les jours dans l’ordre chronologique
  const days = Object.keys(spendingPerDay).sort(
    (a, b) => new Date(a) - new Date(b),
  );

  const amounts = days.map((d) => spendingPerDay[d]);

  return { days, amounts };
}

function getGlobalSpendingChartData() {
  let spendingPerDay = {};

  blockchain.forEach((block) => {
    block.data?.transactions?.forEach((tx) => {
      if (tx.from !== "MINT") {
        const day = new Date(tx.timestamp).toISOString().slice(0, 10);
        spendingPerDay[day] = (spendingPerDay[day] || 0) + tx.amount;
      }
    });
  });

  const days = Object.keys(spendingPerDay).sort(
    (a, b) => new Date(a) - new Date(b),
  );

  const amounts = days.map((d) => spendingPerDay[d]);

  return { days, amounts };
}

function getKnownAddresses() {
  const set = new Set();

  blockchain.forEach((block) => {
    block.data?.transactions?.forEach((tx) => {
      if (tx.from && tx.from !== "MINT") set.add(tx.from);
      if (tx.to) set.add(tx.to);
    });
  });
  // ✅ Supprime ma propre adresse
  return Array.from(set).filter((addr) => addr !== publicKey);
}

function renderKnownNodes() {
  const addrs = getKnownAddresses();

  if (addrs.length === 0) {
    return "<p>Aucune adresse connue pour l’instant.</p>";
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `
  <ul>
   ${addrs
     .map((addr, i) => {
       const label = `node${alphabet[i] || i}`;
       return `
   <li style="margin-bottom:5px;">
      <b>${label}</b><br>
      <code style="font-size:12px;">${addr}</code><br>
      <button 
         onclick="copyToClipboard('${i}', '${addr}')"
         style="margin-top:2px; cursor:pointer;"
         >
      📋 Copier
      </button>
      📋 Copier
      </button>
      <span id="msg-${i}" style="margin-left:6px; color:green;"></span>
   </li>
   `;
     })
     .join("")}
</ul>
  `;
}

function notifyPeer(peer, message) {
  let host = peer;
  let port = P2P_PORT;

  if (peer.includes(":")) {
    [host, port] = peer.split(":");
    port = parseInt(port);
  }

  const client = net.createConnection({ host, port });

  // ⚡ mini timeout juste pour éviter blocage
  client.setTimeout(300);

  client.on("connect", () => {
    sendFramed(client, message);
    client.end(); // 👋 terminé direct
  });

  client.on("timeout", () => {
    client.destroy(); // abandon immédiat
  });

  client.on("error", () => {
    // 🔇 silence total : notification best effort
  });
}

function gracefulShutdown() {
  log("📌 Début arrêt...");
  log("📢 Notification des peers...");
  broadcastShutdown();
  //

  // 2. Fermer les sockets actives
  log(`🔌 Fermeture de ${sockets.size} connexions...`);
  for (const sock of sockets) {
    sock.end();
    sock.destroy();
  }

  // stop timeouts
  clearTimeout(syncTimeout);
  clearTimeout(bootstrapTimeout);

  // stop loops
  clearInterval(forgeInterval);
  clearInterval(followerInterval);

  log("⏹️ Toutes les boucles stoppées");

  // 3. Sauvegarder blockchain si master
  if (nodeID === MASTER_ID) {
    saveBlockchain();
    log("✅ Données sauvegardées Master Controle");
  }
  //saveMempoolToDisk();

  // 4. Fermer serveur TCP
  server.close(() => {
    log("✅ Serveur TCP ou TLS fermé");

    // 5. Fermer serveur web
    webServer.close(() => {
      log("✅ Serveur Web fermé");

      log("👋 Arrêt complet. Bye.");
      process.exit(0);
    });
  });
  shuttingDown = true;
}

function broadcastShutdown() {
  peers.forEach((peer) =>
    notifyPeer(peer, { type: "NODE_SHUTDOWN", from: nodeID }),
  );
}

app.get("/", (req, res) => {
  const wealth = getWealthChartData();
  const stats = getWalletActivity();
  const spending = getSpendingChartData(publicKey);
  const spendingGlobal = getGlobalSpendingChartData();
  res.send(`
    <html>
   <head>
      <title>${nodeID} Dashboard</title>
      <style>
         body {
         font-family: system-ui;
         padding: 10px;
         background: #f7f7f7;
         }
         h2 {
         margin-bottom: 10px;
         }
         .grid {
         display: grid;
         grid-template-columns: 1fr 1fr;
         gap: 15px;
         }
         .box {
         background: white;
         padding: 15px;
         border-radius: 12px;
         border: 1px solid #ddd;
         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
         }
         code {
         display: block;
         background: #111;
         color: lime;
         padding: 10px;
         border-radius: 8px;
         font-size: 12px;
         overflow-x: auto;
         }
         ul {
         padding-left: 18px;
         }
         li {
         margin: 4px 0;
         }
         button {
         padding: 10px;
         width: 100%;
         border: none;
         border-radius: 10px;
         background: darkblue;
         color: white;
         font-weight: bold;
         cursor: pointer;
         }
         button:hover {
         opacity: 0.9;
         }
         textarea,
         input {
         width: 100%;
         padding: 8px;
         border-radius: 8px;
         border: 1px solid #ccc;
         }
         pre {
         background: black;
         color: lime;
         padding: 10px;
         font-size: 13px;
         height: 180px;
         overflow-y: scroll;
         border-radius: 10px;
         }
         canvas {
         width: 100% !important;
         max-height: 250px;
         }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
   </head>
   <body>
      <h2>📡 Node Dashboard — ${nodeID}</h2>
      <div class="box">${renderNodeAddress()}</div>
      <div class="box">
         <h3>👥 Adresses connues 🌐</h3>
         <script>
            function copyToClipboard(id,text) {
              navigator.clipboard.writeText(text).then(() => {
                const el =document.getElementById("msg-"+id);
                el.innerText = "✅ Copié";
                //alert("Adresse copiée !");
                    setTimeout(() => {
                      el.innerText = "";
                    }, 2000);
                
              });
            }
         </script>
         ${renderKnownNodes()}
      </div>
      <div class="grid">
      <div class="box">
         <h3>⛓ Blockchain</h3>
         <p><b>Blocs :</b> ${blockchain.length}</p>
         <h4>Derniers blocs :</h4>
         ${renderLastBlocks()}
      </div>
      <div class="box">
         <h3>🛑 Arrêt du node</h3>
         <button onclick="shutdownNode()" style="background:red;color:white;padding:8px;">
         Stop Node
         </button>
         
      </div>
      <div class="box">
         <h3>💰 Balances</h3>
         ${renderBalances()}
      </div>
      <div class="box">
         <h3>📜 Transactions confirmées</h3>
         ${renderLastTransactions()}
      </div>
      <div class="box">
         <h3>📥 Mempool</h3>
         <p>Transactions en attente : ${mempool.length}</p>
      </div>
      <div class="box">
         <h3>💸 Envoyer une transaction</h3>
         <form method="POST" action="/tx">
            <p>To (public key)</p>
            <textarea name="to" rows="2"></textarea>
            <p>Amount</p>
            <input name="amount" type="number" />
            <br /><br />
            <button type="submit">Envoyer 💸</button>
         </form>
      </div>
      <div class="box">
         <h3>🖥 Logs récents</h3>
         <pre>${logs.join("\n")}</pre>
      </div>
      <div class="box">
         <p><b>Connexions actives :</b> ${sockets.size}</p>
         <p><b>Connexions totales depuis démarrage :</b> ${connectionCount}</p>
      </div>
      <div class="box">
         <ul>
            ${Object.entries(stats)
              .map(
                ([wallet, count]) => `
            <li>${wallet.slice(0, 12)}... : ${count} tx</li>
            `,
              )
              .join("")}
         </ul>
      </div>
      <div class="box">
           <h3>📬 Inbox éphémère</h3>
           ${renderInbox()}
      </div>
<div class="box">
  <h3>✉️ Envoyer un message</h3>

  <form method="POST" action="/mail">
    
    <p>Destinataire (clé publique)</p>
    <textarea name="to" rows="2" style="width:100%;"></textarea>

    <p>Message</p>
    <textarea name="text" rows="3" style="width:100%;"></textarea>

    <br><br>
    <button type="submit">📨 Envoyer</button>
  </form>
</div>


      <div class="box">
         <h3>🥧 Répartition des richesses</h3>
         <canvas id="pieChart"></canvas>
         <script>
              const pieLabels = ${JSON.stringify(wealth.labels)};
               const pieValues = ${JSON.stringify(wealth.values)};
            
              new Chart(document.getElementById("pieChart"), {
                type: "pie",
                data: {
                  labels: pieLabels,
                  datasets: [{
                    label: "Wealth %",
                    data: pieValues
                  }]
                }
              });
                
         </script>
      </div>
      <div class="box">
         <h3>📉 Vitesse de dépense</h3>
         <canvas id="spendingChart"></canvas>
         <br /><br />
         <canvas id="spendingChartGlobal"></canvas>
         <script>
              const spendingDays = ${JSON.stringify(spending.days)};
               const spendingAmounts = ${JSON.stringify(spending.amounts)};
             
              new Chart(document.getElementById("spendingChart"), {
                type: "line",
                data: {
                  labels: spendingDays,
                  datasets: [{
                    label: "Bouya dépensés par jour",
                    data: spendingAmounts
                  }]
                }
              });
         </script>
         <script>
                const spendingDaysGlobal = ${JSON.stringify(spendingGlobal.days)};
               const spendingAmountsGlobal = ${JSON.stringify(spendingGlobal.amounts)};
              
                new Chart(document.getElementById("spendingChartGlobal"), {
                  type: "line",
                  data: {
                    labels: spendingDaysGlobal,
                    datasets: [{
                      label: "Bouya dépensés par jour Globalement",
                      data: spendingAmountsGlobal 
                    }]
                  }
                });
         </script>
      </div>
      <script>
         function shutdownNode() {
           if (!confirm("⚠️ Voulez-vous vraiment arrêter ce node ?")) return;
         
           fetch("/shutdown", { method: "POST" })
             .then(() => {
               alert("Node en cours d’arrêt...");
             })
             .catch(() => {
               alert("Erreur pendant l’arrêt.");
             });
         }
      </script>
   </body>
</html>

    `);
});

app.post("/tx", (req, res) => {
  log(req.body);
  const { to, amount } = req.body;

  // Validation simple pour éviter les crashs
  if (!to || !amount) {
    log("❌ Erreur: Destinataire ou montant manquant");
    return res.status(400).send("Champs manquants");
  }
  const amountInt = parseInt(amount);
  if (isNaN(amountInt)) {
    log(">> ❌ Erreur : Le montant n'est pas un nombre valide");
    return res.redirect("/?error=nan");
  }

  const tx = {
    from: publicKey,
    to: to.trim(),
    amount: parseInt(amount),
    timestamp: Date.now(),
  };

  if (!isMintTransaction(tx) && tx.amount <= 0) {
    log(">> ❌ Tentative applyTransaction avec montant invalide");
    return;
  }

  // Important: L'ID doit être créé AVANT la signature ou inclus dans le hash
  tx.id = createTransactionId(tx);
  tx.signature = signTransaction(tx, privateKey);

  // Ajout au mempool local
  mempool.push(tx);

  logs.push(`💸 TX créée → ${tx.amount} vers ${tx.to.slice(0, 12)}...`);

  // Propagation réseau (optionnel tout de suite)
  peers.forEach((peer) =>
    sendMessage(peer, {
      type: "NEW_TX",
      from: nodeID,
      tx,
    }),
  );

  res.redirect("/");
});

app.post("/shutdown", (req, res) => {
  log("🛑 Shutdown demandé depuis le dashboard");

  res.send("OK arrêt en cours...");

  gracefulShutdown();
});

app.post("/mail", (req, res) => {
  const { to, text } = req.body;

  if (!to || !text) {
    log("❌ Mail incomplet");
    return res.redirect("/");
  }

  sendMail(to.trim(), text.trim());

  log("📤 Message envoyé depuis le dashboard");

  res.redirect("/");
});

process.on("SIGINT", () => {
  log("⚠️ Ctrl+C détecté → arrêt propre...");
  log("⚠️ Shutdown Brutal...");
  gracefulShutdown();
});

let webServer;

switch (NETWORK_MODE) {
  case "docker":
    webServer = app.listen(WEB_PORT, "0.0.0.0", () => {
      log(`>> 🌍 Dashboard Web (Docker) sur http://localhost:${WEB_PORT}`);
    });
    break;

  case "ip":
    webServer = app.listen(WEB_PORT, "0.0.0.0", () => {
      log(`>> 🌍 Dashboard Web (IP) sur http://<TON_IP>:${WEB_PORT}`);
    });
    ///////////////////////////////////////////////////////////////////////////////////////POUR TESTER
   // server.on("secureConnection", (socket) => { console.log("Peer cert:", socket.getPeerCertificate());});

    break;

  default:
    webServer = app.listen(WEB_PORT, () => {
      log(
        `>> 🌍 Dashboard Web (local Defaulting) sur http://localhost:${WEB_PORT}`,
      );
    });
}
