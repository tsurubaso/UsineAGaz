const nodeID = process.env.NODE_ID;
const publicKey = process.env.PUBLIC_KEY;

console.log(`--- DÉMARRAGE DU NOEUD ${nodeID} ---`);
//console.log(`Mon adresse publique est : ${publicKey}`);

// Pour éviter que le container s'arrête (EXIT 0) tout de suite :
import net from "net";
const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const message = JSON.parse(data.toString());
    console.log(`[${process.env.NODE_ID}] Message reçu :`, message);
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



server.listen(5000, () => {
  console.log(`[${process.env.NODE_ID}] Serveur prêt.`);

  // PETIT TEST : Le Node 1 envoie un message aux autres après 5 secondes
  //console.log("Mon ID est :", nodeID);
  if (process.env.NODE_ID === "MASTER_NODE") {
    setTimeout(() => {
      peers.forEach((peer) => {
        sendMessage(peer, {
          type: "HELLO",
          from: "MASTER_NODE",
          text: "Salut les gars !",
        });
      });
    }, 5000);
  }
});
