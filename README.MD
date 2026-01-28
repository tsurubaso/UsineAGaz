<!-- for visualisation Ctrl + Shift + V -->
---


`crypto` est le module natif Node.js.
Il sert uniquement au **hachage SHA-256**, pas à la signature elliptique.

`net` est le module TCP bas niveau.
Ici, tu construis volontairement un réseau **sans HTTP, sans WebSocket**, pour rester au plus proche d’un vrai protocole P2P.

`@noble/curves/secp256k1` est la librairie cryptographique moderne.
Elle ne fait **que de la crypto pure**, sans réseau, sans encodage implicite.

`hexToBytes` est indispensable : noble **ne travaille jamais avec des strings**, uniquement avec des bytes (`Uint8Array`).

---

### 0. Configuration du nœud

Chaque instance du programme est **le même code**, mais son comportement dépend de l’environnement :

* `NODE_ID` : identifie le nœud (node1, node2, node3)
* `NODE1_PRIVATE_KEY` : clé privée du MASTER uniquement
* `NODE1_PUBLIC_KEY` : clé publique du MASTER (connue de tous)

---

### 1. État local

```js
let blockchain = [];
```

Chaque nœud possède **sa propre copie locale** de la blockchain.
Il n’y a pas de base de données ici :

* c’est volontaire
* ça permet de raisonner uniquement sur la logique protocolaire

---

### 2. Fonctions cryptographiques (hors réseau)

Cette section est très importante conceptuellement.

👉 **Aucune de ces fonctions ne connaît le réseau, les sockets ou les peers**.

---

#### Hash structurel du bloc

`calculateHash(...)`

Ce hash :

* est **lisible** (hex)
* est **stocké dans le bloc**
* sert à **chaîner les blocs entre eux**

Il garantit :

* l’intégrité du contenu
* la continuité de la chaîne

Ce hash **n’est PAS utilisé pour la signature**.
C’est volontairement séparé.

---

#### Hash cryptographique pour la signature

`hashBlockForSignature(block)`

Ici, on prépare **le message cryptographique**.

Points clés :

* même contenu logique que le hash structurel
* mais sortie en **bytes**, pas en hex
* format exigé par noble

👉 C’est ce hash précis qui est signé et vérifié.
👉 Aucune ambiguïté possible sur ce qui est signé.

---

#### Signature du bloc (MASTER uniquement)

`signBlock(block, privateKeyHex)`

Processus exact :

1. Calcul du hash cryptographique (bytes)
2. Conversion de la clé privée hex → bytes
3. Signature elliptique secp256k1
4. Conversion du résultat en hex pour le transport réseau

Important conceptuellement :

* **on signe des bytes**
* **on transporte du hex**
* la frontière est claire

---

#### Vérification de la signature

`verifyBlockSignature(block)`

C’est le miroir exact de la signature.

Le nœud :

* reconstruit le message (hash bytes)
* reconvertit signature et clé publique en bytes
* appelle `secp256k1.verify(...)`

Si ça échoue :

* soit le contenu a été modifié
* soit la signature ne correspond pas au signataire

👉 Aucune confiance implicite.
👉 Zéro logique métier ici, uniquement de la crypto.

---

### 3. Bloc Genesis

`createGenesisBlock()`

Le Genesis est :

* déterministe
* identique sur tous les nœuds
* non dépendant du réseau

Il **n’est pas signé ici**.
La signature est ajoutée plus tard, uniquement par le MASTER.

C’est très propre comme séparation de responsabilités.

---

### 4. Initialisation de la blockchain

Tous les nœuds :

* créent le Genesis localement
* le poussent dans leur blockchain

Mais :

* **seul node1 le signe**
* les autres nœuds le reçoivent signé via le réseau

C’est exactement le rôle d’un **nœud autorité initial**.

---

### 5. Réseau : peers et envoi

Les peers sont calculés dynamiquement :

```js
["node1", "node2", "node3"].filter(...)
```

Chaque nœud sait :

* qui il est
* qui il n’est pas

`sendMessage()` :

* ouvre une connexion TCP
* envoie un message JSON brut
* ferme la connexion

👉 Simple, lisible, suffisant pour un proto P2P.

---

### 6. Serveur TCP

Chaque nœud écoute sur le même port.

À la réception :

1. Parsing JSON
2. Vérification du type de message
3. Validation du bloc

La validation est **strictement ordonnée** :

1. hash structurel
2. signature cryptographique

👉 Si le hash échoue, inutile de vérifier la signature.
👉 C’est exactement l’ordre logique attendu.

---

### 7. Démarrage

Au démarrage :

* chaque nœud lance son serveur
* le MASTER vérifie qu’il possède bien une clé privée
* le MASTER diffuse le Genesis après un délai

Le `setTimeout` est là pour :

* laisser les autres nœuds démarrer
* éviter des erreurs de connexion prématurées

---

### En résumé

On a :

* une **base blockchain saine**
* une **crypto moderne correctement utilisée**
* une **séparation nette entre logique, crypto et réseau**
* un Genesis signé proprement
* une validation réaliste côté nœuds
