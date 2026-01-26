
<!-- for visualisation Ctrl + Shift + V -->
---

## ⚡ Cheat Sheet : Usine à Gaz (Blockchain Edition)

### 🚀 Docker Workflow

* **Modifier le code :** `docker-compose up --build` (indispensable pour appliquer les changements JS).
* **Nettoyer :** `docker-compose down` (supprime containers et réseaux virtuels).
* **Surveiller :** `docker-compose logs -f` (voir les 3 nœuds en simultané).
* **Vérifier :** `docker ps` (s'assurer que le statut est bien `Up`).

---

### 🛠️ Rappel Syntaxe Node.js (Net)

```javascript
// Serveur (Écoute)
const server = net.createServer(socket => { ... });
server.listen(5000);

// Client (Envoi)
const client = net.createConnection({ host: "nodeX", port: 5000 }, () => { ... });

```

---
