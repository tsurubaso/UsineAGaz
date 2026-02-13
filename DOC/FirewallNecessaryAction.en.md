 Back to README: [English](../README.md) | [Français](README.fr.md) | [日本語](README.ja.md)

To allow nodes to communicate with each other on specific TCP ports (e.g., 5001 and 5002) in Windows, it is necessary to configure rules in **Windows Defender Firewall** to allow both inbound and outbound traffic. The following commands set up these rules:

---

### 1. Allow inbound traffic (Node1 and Node2)

For TCP port 5002 inbound:

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5002 Inbound" -Direction Inbound -Protocol TCP -LocalPort 5002 -Action Allow
```

For TCP port 5001 inbound as well:

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5001 Inbound" -Direction Inbound -Protocol TCP -LocalPort 5001 -Action Allow
```

---

### 2. Allow outbound traffic (Node1 and Node2)

For TCP port 5002 outbound:

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5002 Outbound" -Direction Outbound -Protocol TCP -RemotePort 5002 -Action Allow
```

For TCP port 5001 outbound as well:

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5001 Outbound" -Direction Outbound -Protocol TCP -RemotePort 5001 -Action Allow
```

---

### 3. Verify the rules

To confirm that the rules have been applied:

```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node TCP*"}
```

---

### 4. Test connectivity after configuring the firewall

From Node1 to Node2:

```powershell
Test-NetConnection 192.168.X.Y -Port 5002
```

From Node2 to Node1:

```powershell
Test-NetConnection 192.168.X.Y -Port 5001
```

If `TcpTestSucceeded` is `True`, communication is established correctly.

---

### Important notes

* On a local network behind a NAT router, outbound port rules are usually not required, but adding them does no harm.
* Rules can be restricted to specific network interfaces (`InterfaceAlias`) such as Wi-Fi or Ethernet, but for initial testing it is simpler to allow all interfaces.

---