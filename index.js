import crypto from 'crypto';

// Initialisation de la chaîne locale pour chaque nœud
let blockchain = [];

const nodeID = process.env.NODE_ID;
const publicKey = process.env.PUBLIC_KEY;

console.log(`--- DÉMARRAGE DU NOEUD ${nodeID} ---`);
//console.log(`Mon adresse publique est : ${publicKey}`);

// Pour éviter que le container s'arrête (EXIT 0) tout de suite :
import net from "net";
const server = net.createServer((socket) => {
socket.on('data', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === "CHECK_GENESIS") {
        const isSame = msg.block.hash === blockchain[0].hash;
        console.log(`[${nodeID}] Comparaison Genesis avec ${msg.from} : ${isSame ? "✅ IDENTIQUE" : "❌ ERREUR"}`);
    }
});
});


const peers = ["node1", "node2", "node3"].filter(
  (id) => id !== process.env.NODE_ID,
);
// On filtre pour ne pas s'appeler soi-même !

function sendMessage(targetNode, message) {
  const client = net.createConnection({ host: targetNode, port: 5000 }, () => {
    console.log(`[${process.env.NODE_ID}] Connecté à ${targetNode}`);
    client.write(JSON.stringify(message));
    client.end(); // On raccroche après l'envoi
  });

  client.on("error", (err) => {
    // C'est normal si les autres nœuds ne sont pas encore prêts au démarrage
    console.log(`[${process.env.NODE_ID}] Impossible de joindre ${targetNode}`);
  });
}


// Fonction pour calculer le Hash d'un bloc
function calculateHash(index, previousHash, timestamp, data) {
    return crypto
        .createHash('sha256')
        .update(index + previousHash + timestamp + JSON.stringify(data))
        .digest('hex');
}



// Création du Bloc Genesis (Le Bloc #0)
function createGenesisBlock() {
    const timestamp = "2024-01-01"; // Date fixe pour que tout le monde ait le même hash
    const data = { message: "Genesis Block - Naissance de la Buyabuya" };
    const hash = calculateHash(0, "0", timestamp, data);
    
    return { index: 0, previousHash: "0", timestamp, data, hash };
}



// Chaque nœud commence avec le même bloc
blockchain.push(createGenesisBlock());

console.log(`[${nodeID}] Bloc Genesis créé : ${blockchain[0].hash.substring(0, 10)}...`);

// 3. LE SERVEUR (DOIT ÊTRE HORS DE TOUT IF)
server.listen(5000, () => {
    console.log(`[${nodeID}] Serveur d'écoute actif.`);

    if (nodeID === "MASTER_NODE") {
        setTimeout(() => {
            peers.forEach(peer => {
                console.log(`[${nodeID}] Tentative d'envoi vers ${peer}...`);
                sendMessage(peer, { type: "NEW_BLOCK", from: nodeID, block: blockchain[0] });
            });
        }, 10000);
    }
});