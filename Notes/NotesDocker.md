
---

## 🛠️ Docker & Docker-Compose : Le Résumé

L'objectif est de transformer ton code JavaScript en un **réseau de 3 machines indépendantes** (nodes) qui tournent simultanément.

### 1. Les Commandes Essentielles

| Commande | Ce qu'elle fait concrètement |
| --- | --- |
| `docker-compose up --build` | **La plus importante.** Elle (re)construit tes images (prend en compte tes modifs de code) et lance les 3 containers. |
| `docker-compose logs -f` | Affiche les `console.log()` de tes 3 machines en temps réel (pratique pour débugger). |
| `docker-compose down` | Éteint proprement les machines et libère la mémoire. |
| `docker ps` | Liste les containers actifs pour vérifier qu'aucun n'a planté (`Up` ou `Exited`). |

---

### 2. Le Rôle des Fichiers

#### 📄 `Dockerfile`

C'est le **plan de construction** d'une seule machine.

* Il définit l'environnement (Node.js).
* Il installe tes dépendances (`npm install`).
* Il définit la commande de démarrage (`node index.js`).

#### 📄 `.env` (Le coffre-fort)

Il contient tes **données sensibles** et spécifiques (clés privées, IDs). Ce fichier ne bouge pas, il sert de base de données à Docker.

#### 📄 `docker-compose.yml` (L'orchestrateur)

C'est lui qui crée le réseau. Il fait le pont entre ton `.env` et tes containers.

* Il **renomme** les variables pour le code : `NODE1_PUBLIC_KEY` devient simplement `PUBLIC_KEY` à l'intérieur du container.
* Il permet d'avoir **un seul code `index.js**` pour tous les nœuds.

---

### 3. Pourquoi `undefined` arrive ? (Checklist)

Si tu vois `undefined` dans tes logs, vérifie ces trois points :

1. **La Casse :** `NODE_ID` (YAML) doit être écrit exactement pareil dans `process.env.NODE_ID` (JS).
2. **Le Build :** Si tu changes le `.env` ou le YAML, Docker ne le voit pas toujours. Fais un `up --build`.
3. **Le Mapping :** Vérifie que dans ton YAML, la ligne ressemble bien à `- PUBLIC_KEY=${NODE1_PUBLIC_KEY}`.

---

### 4. État actuel de ton réseau

Tes 3 nœuds sont maintenant dans des "cellules" séparées :

* Ils ont chacun leur **identité** (lue depuis le `.env`).
* Ils ont chacun leur **port 5000** ouvert (grâce à `net.createServer`).
* Ils **restent allumés** (le serveur socket empêche le script de s'arrêter).

