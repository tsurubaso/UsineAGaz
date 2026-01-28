import crypto from 'crypto';
import net from "net";

/*
────────────────────────────────────────
1. ÉTAT LOCAL DU NŒUD
────────────────────────────────────────
Chaque conteneur / nœud possède sa propre
copie locale de la blockchain.
Ici, on commence avec une chaîne vide.
*/
let blockchain = [];

/*
Chaque nœud reçoit son identité et sa clé
publique via des variables d’environnement
(Docker / docker-compose).
*/
const nodeID = process.env.NODE_ID;

//const publicKey = process.env.PUBLIC_KEY;

console.log(`--- DÉMARRAGE DU NOEUD ${nodeID} ---`);
// console.log(`Mon adresse publique est : ${publicKey}`);


/*
────────────────────────────────────────
2. SERVEUR TCP DU NŒUD
────────────────────────────────────────
On crée un serveur TCP pour que les autres
nœuds puissent nous envoyer des messages.
Sans ça, le container s’arrêterait immédiatement.
*/
const server = net.createServer((socket) => {

  // À chaque message reçu sur la socket
  socket.on('data', (data) => {

    // Les messages sont envoyés en JSON
    const msg = JSON.parse(data.toString());

    /*
    Message de vérification du Genesis Block :
    chaque nœud compare le hash reçu avec
    le hash de SON propre bloc genesis.
    */
    if (msg.type === "CHECK_GENESIS") {
        const isSame = msg.block.hash === blockchain[0].hash;

        console.log(
          `[${nodeID}] Comparaison Genesis avec ${msg.from} : ${
            isSame ? "✅ IDENTIQUE" : "❌ ERREUR"
          }`
        );
    }
  });
});


/*
────────────────────────────────────────
3. LISTE DES PAIRS (PEERS)
────────────────────────────────────────
On définit la liste des nœuds connus,
en retirant notre propre ID pour éviter
de s’envoyer des messages à soi-même.
*/
const peers = ["node1", "node2", "node3"].filter(
  (id) => id !== process.env.NODE_ID,
);

console.log(`[${nodeID}] Peers connus : ${peers.join(", ")}`);


/*
────────────────────────────────────────
4. ENVOI DE MESSAGE À UN AUTRE NŒUD
────────────────────────────────────────
Fonction utilitaire pour ouvrir une
connexion TCP, envoyer un message,
puis fermer la connexion.
*/
function sendMessage(targetNode, message) {

  const client = net.createConnection(
    { host: targetNode, port: 5000 },
    () => {
      console.log(`[${nodeID}] Connecté à ${targetNode}`);

      // Envoi du message sous forme JSON
      client.write(JSON.stringify(message));

      // On ferme la connexion après l’envoi
      client.end();
    }
  );

  /*
  Les erreurs sont normales au démarrage :
  les autres conteneurs ne sont pas
  forcément encore prêts.
  */
  client.on("error", () => {
    console.log(`[${nodeID}] Impossible de joindre ${targetNode}`);
  });
}


/*
────────────────────────────────────────
5. CALCUL DU HASH D’UN BLOC
────────────────────────────────────────
Le hash dépend :
- de l’index
- du hash précédent
- du timestamp
- des données
Toute modification casse le hash.
*/
function calculateHash(index, previousHash, timestamp, data) {
    return crypto
        .createHash('sha256')
        .update(index + previousHash + timestamp + JSON.stringify(data))
        .digest('hex');
}


/*
────────────────────────────────────────
6. CRÉATION DU BLOC GENESIS
────────────────────────────────────────
Bloc spécial (#0), identique sur tous
les nœuds :
- date fixe
- données fixes
=> hash identique partout
*/
function createGenesisBlock() {

    const timestamp = "2024-01-01"; // DOIT être strictement identique
    const data = { message: "Genesis Block - Naissance de la Buyabuya" };

    const hash = calculateHash(0, "0", timestamp, data);

    return {
      index: 0,
      previousHash: "0",
      timestamp,
      data,
      hash
    };
}


/*
────────────────────────────────────────
7. INITIALISATION DE LA BLOCKCHAIN
────────────────────────────────────────
Chaque nœud commence avec exactement
le même bloc genesis.
*/
blockchain.push(createGenesisBlock());

console.log(
  `[${nodeID}] Bloc Genesis créé : ${blockchain[0].hash.substring(0, 10)}...`
);


/*
────────────────────────────────────────
8. DÉMARRAGE DU SERVEUR TCP
────────────────────────────────────────
Le serveur doit être hors de toute
condition pour être actif sur tous
les nœuds.
*/
server.listen(5000, () => {
    console.log(`[${nodeID}] Serveur d'écoute actif.`);

    /*
    Seul le nœud maître (MASTER_NODE)
    envoie le bloc genesis aux autres
    après un délai (le temps qu’ils démarrent).
    */
    if (nodeID === "node1") {

        setTimeout(() => {

            peers.forEach(peer => {
                console.log(`[${nodeID}] Tentative d'envoi vers ${peer}...`);

                sendMessage(peer, {
                  type: "NEW_BLOCK",
                  from: nodeID,
                  block: blockchain[0]
                });
            });

        }, 10000);
    }
});
