 Back to README: [English](../README.MD) | [Français](README.fr.md) | [日本語](README.ja.md)

Pour que les nœuds puissent communiquer entre eux sur des ports TCP spécifiques (par exemple 5001 et 5002) sous Windows, il est nécessaire de configurer des règles dans le **Pare-feu Windows Defender** afin d’autoriser le trafic entrant et sortant. Les commandes suivantes permettent de mettre en place ces règles.

---

### 1. Autorisation du trafic entrant (Node1 et Node2)

Pour autoriser le port TCP 5002 en entrée :

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5002 Inbound" -Direction Inbound -Protocol TCP -LocalPort 5002 -Action Allow
```

Pour autoriser également le port 5001 en entrée :

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5001 Inbound" -Direction Inbound -Protocol TCP -LocalPort 5001 -Action Allow
```

---

### 2. Autorisation du trafic sortant (Node1 et Node2)

Pour autoriser le port TCP 5002 en sortie :

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5002 Outbound" -Direction Outbound -Protocol TCP -RemotePort 5002 -Action Allow
```

Pour autoriser également le port 5001 en sortie :

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5001 Outbound" -Direction Outbound -Protocol TCP -RemotePort 5001 -Action Allow
```

---

### 3. Vérification des règles créées

Pour s’assurer que les règles ont bien été appliquées :

```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node TCP*"}
```

---

### 4. Vérification de la connectivité après configuration du pare-feu

Depuis Node1 vers Node2 :

```powershell
Test-NetConnection 192.168.X.Y -Port 5002
```

Depuis Node2 vers Node1 :

```powershell
Test-NetConnection 192.168.X.Y -Port 5001
```

Si le résultat `TcpTestSucceeded` est `True`, la communication est correctement établie.

---

### Remarques importantes

* Sur un réseau local derrière un routeur NAT, il n’est généralement pas nécessaire d’autoriser le port sortant, mais le faire ne pose aucun problème.
* Il est possible de limiter les règles à certaines interfaces réseau (`InterfaceAlias`) comme Wi-Fi ou Ethernet, mais pour les tests initiaux, il est recommandé de laisser toutes les interfaces autorisées.

---
