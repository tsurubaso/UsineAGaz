<!-- for visualisation Ctrl + Shift + V -->

# Notes – Mise en route du serveur Ubuntu (jusqu’à Node, Docker, VS Code)

Ces notes récapitulent **tout ce qu’on a vu depuis le début** : prise en main d’Ubuntu “pur”, réseau, utilisateurs, Docker, Node.js et VS Code, jusqu’au point où *tout est prêt*.

---

## 1. Contexte de départ

* PC d’entreprise sous **Ubuntu**
* PC d'entreprise personnel séparé

---

## 2. Réseau : comprendre où on est

### Voir les interfaces réseau

```
ip a
```

Important :

* `lo` → loopback (127.0.0.1, 10.255.255.255/32 → inutile pour le LAN)
* `eth0` → vraie interface réseau

### Voir la route par défaut

```
ip route
```

Exemple vu :

```
default via 172.21.0.1 dev eth0
172.21.0.0/20 dev eth0 src 172.21.10.16
```

➡️ La machine est **derrière un réseau sécurisé d’entreprise**, pas directement exposée par le routeur perso.

---

## 3. Tester la connectivité

### Depuis une autre machine

```
ping IP_UBUNTU
```

Résultat OK :

* paquets envoyés = reçus
* latence faible (2–4 ms)

➡️ La machine est bien accessible **sur le LAN**

---

## 4. Gestion des utilisateurs Ubuntu

### Créer un nouvel utilisateur

```
sudo adduser newuser
```

Questions pendant la création :

* mot de passe
* nom complet
* 部屋番号 = numéro de bureau (peut être vide)

### Donner les droits sudo

(en étant sur le compte admin)

```
sudo usermod -aG sudo newuser
```

Vérifier :

```
groups newuser
```

---

## 5. Comprendre `sudo`

* `sudo` = **Super User DO**
* permet d’exécuter une commande avec les droits administrateur
* protège le système contre les erreurs accidentelles

Sans être dans le groupe sudo :

```
newuser は sudoersファイルにありません
```

---

## 6. Mise à jour du système

### Mise à jour des listes de paquets

```
sudo apt update
```

### Mise à jour des logiciels installés

```
sudo apt upgrade
```

➡️ Met à jour le système, **sans rien casser**

---

## 7. Docker : bases essentielles

### Vérifier que Docker fonctionne

```
docker --version
docker info
```

### Voir les containers en cours

```
docker ps
```

### Voir tous les containers (même arrêtés)

```
docker ps -a
```

### Voir les images Docker

```
docker images
```

---

## 8. Différence image / container

* **Image** = modèle (template immuable)
* **Container** = instance vivante de l’image

Analogie :

* Image = recette
* Container = plat en cours de cuisson

---

## 9. Supprimer des containers (hello-world)

### Arrêter tous les containers

```
docker stop $(docker ps -aq)
```

### Supprimer tous les containers

```
docker rm $(docker ps -aq)
```

### Vérifier qu’il ne reste rien

```
docker ps -a
```

(Les images restent intactes)

---

## 10. Copier / interrompre dans le terminal

* `Ctrl + C` → interrompre un processus
* `Ctrl + Shift + C` → copier (terminal graphique)
* `Ctrl + Shift + V` → coller

---

## 11. Installation de Node.js (bonne méthode)

⚠️ Éviter le Node.js fourni par Ubuntu (souvent trop vieux)

### Installer Node.js 20 LTS via NodeSource

```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Vérifier

```
node -v
npm -v
```

---

## 12. Mises à jour Node.js

* `apt upgrade` **ne mettra PAS Node 20 → 24**
* Node reste sur la branche installée
* Pour changer de version : nouvelle source ou nvm

➡️ Node 20 LTS = bon choix pro

---

## 13. Où sont installés les programmes sous Ubuntu

* Binaires système : `/usr/bin`, `/usr/lib`
* Config globale : `/etc`
* Données utilisateur : `/home/newuser`
* Snap packages : isolés (par utilisateur mais partagés)

### Lister les programmes

Via apt :

```
apt list --installed
```

Via snap :

```
snap list
```

---

## 14. Visual Studio Code

* Déjà installé
* Les mises à jour sont automatiques (snap ou repo Microsoft)

Vérifier :

```
code --version
```

---

## 15. État final atteint

À ce stade :

* Ubuntu propre
* Utilisateur dédié
* Réseau fonctionnel
* Docker opérationnel
* Node.js 20 LTS installé
* VS Code installé et à jour

➡️ **Base serveur prête** pour développer et déployer une application.

---

