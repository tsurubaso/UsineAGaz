 Back to README: [English](../README) | [Français](README.fr.md) | [日本語](README.ja.md)



Windows上でノード同士が特定のTCPポート（例：5001、5002）で通信できるようにするには、**Windows Defender ファイアウォール**で受信・送信トラフィックを許可するルールを設定する必要があります。以下のコマンドでルールを作成できます。

---

### 1. 受信トラフィックの許可（Node1とNode2）

TCPポート5002を受信許可する場合：

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5002 Inbound" -Direction Inbound -Protocol TCP -LocalPort 5002 -Action Allow
```

TCPポート5001も受信許可する場合：

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5001 Inbound" -Direction Inbound -Protocol TCP -LocalPort 5001 -Action Allow
```

---

### 2. 送信トラフィックの許可（Node1とNode2）

TCPポート5002を送信許可する場合：

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5002 Outbound" -Direction Outbound -Protocol TCP -RemotePort 5002 -Action Allow
```

TCPポート5001も送信許可する場合：

```powershell
New-NetFirewallRule -DisplayName "Node TCP 5001 Outbound" -Direction Outbound -Protocol TCP -RemotePort 5001 -Action Allow
```

---

### 3. ルールの確認

ルールが正しく作成されているか確認するには：

```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node TCP*"}
```

---

### 4. ファイアウォール設定後の接続確認

Node1からNode2へ：

```powershell
Test-NetConnection 192.168.X.Y -Port 5002
```

Node2からNode1へ：

```powershell
Test-NetConnection 192.168.X.Y -Port 5001
```

`TcpTestSucceeded`が`True`なら、通信は正常に確立されています。

---

### 注意事項

* NATルーターの背後にあるローカルネットワークでは、送信ポートのルールは通常不要ですが、設定しても問題ありません。
* ルールは特定のネットワークインターフェース（`InterfaceAlias`）に制限できますが、初期テストではすべてのインターフェースを許可する方が簡単です。
