<!-- for visualisation Ctrl + Shift + V -->

# Notes – Mise en place WireGuard + Sécurité minimale (Ubuntu)

Ce document regroupe **toutes les commandes vues**, dans l’ordre logique, pour avoir un tunnel WireGuard sécurisé entre deux machines Linux (PC maison ↔ machine bureau).

---

## 1. Installation des outils de base

### Mettre à jour le système

```
sudo apt update
sudo apt upgrade
```

### Installer WireGuard

```
sudo apt install wireguard
```

Vérification :

```
wg --version
```

---

## 2. Génération des clés WireGuard

À faire **sur chaque machine** (maison et bureau).

```
wg genkey | tee privatekey | wg pubkey > publickey
```

Fichiers obtenus :

* `privatekey` → clé privée (ne jamais partager)
* `publickey` → clé publique (à partager avec l’autre machine)

---

## 3. Configuration WireGuard

### Fichier de configuration

Chemin (sur les deux machines) :

```
/etc/wireguard/wg0.conf
```

Éditer le fichier :

```
sudo nano /etc/wireguard/wg0.conf
```

---

### Exemple – PC MAISON (serveur)

```
[Interface]
Address = 10.8.0.1/24
PrivateKey = CLE_PRIVEE_MAISON
ListenPort = 51820

[Peer]
PublicKey = CLE_PUBLIQUE_BUREAU
AllowedIPs = 10.8.0.2/32
```

---

### Exemple – Machine BUREAU (client)

```
[Interface]
Address = 10.8.0.2/24
PrivateKey = CLE_PRIVEE_BUREAU

[Peer]
PublicKey = CLE_PUBLIQUE_MAISON
Endpoint = IP_PUBLIQUE_MAISON:51820
AllowedIPs = 10.8.0.0/24
PersistentKeepalive = 25
```

---

## 4. Démarrer / arrêter WireGuard

Démarrer :

```
sudo wg-quick up wg0
```

Arrêter :

```
sudo wg-quick down wg0
```

État du tunnel :

```
wg
```

Interfaces réseau :

```
ip a
```

---

## 5. Tests de connectivité

Depuis le PC maison :

```
ping 10.8.0.2
```

Depuis la machine bureau :

```
ping 10.8.0.1
```

---

## 6. SSH (connexion distante sécurisée)

Connexion SSH via WireGuard :

```
ssh newuser@10.8.0.2
```

---

## 7. Firewall minimal avec UFW

### Installer UFW (si nécessaire)

```
sudo apt install ufw
```

### Politique par défaut

```
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### Autoriser WireGuard (PC maison uniquement)

```
sudo ufw allow 51820/udp
```

### Autoriser SSH uniquement via WireGuard

```
sudo ufw allow from 10.8.0.0/24 to any port 22
```

### Activer le firewall

```
sudo ufw enable
```

### Vérifier les règles

```
sudo ufw status verbose
```

---

## 8. Vérifications utiles

Voir les services à l’écoute :

```
ss -tuln
```

Vérifier la route réseau :

```
ip route
```

---

## Résumé rapide

* WireGuard = tunnel chiffré privé
* Ping = déclenche la communication
* SSH = accès à la machine via le tunnel
* UFW = tout bloqué sauf WireGuard + SSH via VPN
* Aucun service exposé publiquement

---


