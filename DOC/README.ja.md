🌍 言語: [English](../README) | [Français](README.fr.md) | [日本語](README.ja.md)

# 🪙 Bouya-Bouya Blockchain 🚀

### 分散型P2Pネットワーク（Node.js）

Bouya-Bouya はミニマルなブロックチェーンです。
分散型台帳の基本概念を実装しています：**ECDSA署名**、**P2P伝播**、**Mempool管理**、そして **Master-Node によるコンセンサス**。

---

# 🚀 機能

* **ハイブリッドネットワーク**：`Docker`モード（開発用）と `IP`モード（ローカルネットワーク）の両方に対応。

* **コンセンサス & フォージ**：

  * **Master（Node1）**：ブロック生成（フォージ）と通貨発行を担当。
  * **Followers（NodeX）**：受動的な検証、同期、および中継を担当。

* **暗号学的セキュリティ**：

  * `@noble/curves` による **secp256k1署名**。
  * SHA-256によるブロック連結で整合性を保証。

* **耐障害性メカニズム**：

  * **定期ポーリング**：followersノードは15秒ごとにピアへ問い合わせ、同期ずれを防止。
  * **即時ブートストラップ**：Master起動時に瞬時に「ブロック #1」を生成し、通貨を注入。

* **インタラクティブ・ダッシュボード**：
  チェーン、mempoolの監視やトランザクション送信ができるリアルタイムWeb UI。

---

# 🧱 技術アーキテクチャ

### ブロック構造

各ブロックは、暗号学的ヘッダーとデータ本体を含みます：

* `index`, `previousHash`, `timestamp`, `hash`
* `signer` & `signature`（Masterによる権限証明）
* `data.transactions[]`（承認済みトランザクション一覧）

### 台帳（残高）

残高はそのまま保存されることはありません。
同期やブロック受信のたびに、取引履歴を「再生（リプレイ）」することで **動的に再計算**されます。

---

# 🛠 インストール & 設定

まず Windows [Firewall](DOC/FirewallNecessaryAction.jp.md)
まず
## 1. 前提条件

```bash
npm install express dotenv @noble/curves @noble/hashes crypto-js
```

ウォレット作成のために必要です。

* `wallet.js` を使用する場合、一時的に `elliptic` をインストールして、後で削除してください。

```bash
npm install elliptic
```

---

## 2. 環境変数（.env）

### Docker

```bash
docker compose down
docker-compose build --no-cache
docker-compose up
```

```ini
NETWORK_MODE=docker # ip または docker

# ノード1（管理者）
MASTER_ID=node1
node_id1=node1

NODE1_PRIVATE_KEY=07d69...
NODE1_PUBLIC_KEY=04009...

# ノード2
node_id2=node2
NODE2_PRIVATE_KEY=c6533...
NODE2_PUBLIC_KEY=04380...

# ノード3
node_id3=node3
NODE3_PRIVATE_KEY=ce05e...
NODE3_PUBLIC_KEY=04540...
```

### Node（ローカル/IP）

```ini
NETWORK_MODE=ip # ip または docker

# ノード1（管理者）
MASTER_ID=node1
NODE_ID=node1

NODE1_PRIVATE_KEY=07d69...
NODE1_PUBLIC_KEY=04009...

# ノード2
NODE2_PUBLIC_KEY=04380...

# ノード3
```

---

## 3. ピア設定ファイル（peers.json）

物理マシンのIPアドレスを指定します。
取得するには `ipconfig` を使用してください。

```json
{
  "peersIP": ["192.168.0.0:5001", "192.168.0.0:5002"],
  "peersDocker": ["node1", "node2", "node3", "node4", "node5"]
}
```

---

## ▶️ 使用方法（ローカル/IPモード：Node）

Masterを起動（PC 1）：

```powershell
$env:NODE_ID="node1"; $env:P2P_PORT="5001"; $env:WEB_PORT="3001"; node index.js
```

Followerを起動（PC 2）：

```powershell
$env:NODE_ID="node2"; $env:P2P_PORT="5002"; $env:WEB_PORT="3002"; node index.js
```

---

## 💸 トランザクションのライフサイクル

1. **送信**：Webダッシュボードから作成。
2. **署名**：送信者の秘密鍵でローカル署名。
3. **拡散**：`NEW_TX` を全ノードへ伝播。
4. **Mempool**：ノードの待機領域で保持（残高チェック）。
5. **マイニング**：Masterが次のブロックに含める（20秒ごと）。
6. **承認**：`NEW_BLOCK` を受信し、残高更新とmempoolの整理。

---

## 📌 補足

* **Mint**：`from: "MINT"` のトランザクションを発行できるのはMasterのみ。
* **識別子**：トランザクションの `id` は
  `SHA-256(from + to + amount + timestamp)` によって計算されます。

---
