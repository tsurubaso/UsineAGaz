🌍 言語: [English](../README.MD) | [Français](README.fr.md) | [日本語](README.ja.md)

以下を読む前にこちらをご確認ください（初心者向けガイド）：
[Join the Buya-Bouya Network! 日本語版](JoinTheNetwork.md)

# 🪙 Bouya-Bouya Blockchain 🚀

分散型 P2P ブロックチェーン（Node.js）

Bouya-Bouya は、教育目的で設計されたミニマルかつ低レベル志向のブロックチェーン実装です。
単なる「概念デモ」ではなく、**PoA（Proof of Authority）構成・安全なP2P通信・完全同期・台帳再構築**まで含む実験的ネットワークです。

実装済みの主要概念：

・ECDSA（secp256k1）署名
・PoA（単一Masterによるフォージ）
・安全なTCPメッセージフレーミング
・Mempool整合性管理
・フルチェーン同期 + 増分同期
・動的台帳リプレイ
・ECDH + AES-GCM 暗号通信
・TLSネットワーク対応

---

# 🚀 現在の機能

## 🏛 コンセンサスモデル（PoA）

・**Master Node（唯一）**
　ブロック生成（フォージ）およびMintを担当。
　署名によりブロック正当性を保証。

・**Follower Nodes**
　ブロック検証、チェーン同期、トランザクション中継を担当。
　フォージは行わない。

Masterは常に一意であり、署名検証によってブロックの真正性が保証されます。

---

## 🔄 同期メカニズム

ネットワークは2種類の同期を実装しています。

・**フル同期（Bootstrap Sync）**
　新規ノード参加時に全ブロックを取得し、チェーンを完全再構築。

・**増分同期（Incremental Sync）**
　不足ブロックのみ取得し効率的に更新。

・**定期ポーリング**
　Followerは定期的にピアへ問い合わせを行い、分岐や遅延を検出。

---

## 🔐 暗号セキュリティ

・`@noble/curves` による secp256k1 署名
・SHA-256 によるブロック連結
・ECDH 鍵交換
・AES-GCM によるメッセージ暗号化
・TLS通信（mini-PKI構成対応）

単なる署名検証だけでなく、**通信レイヤー自体も暗号化**されています。

---

## 📡 P2Pネットワーク

Bouya-Bouya は WebSocket ではなく、**ネイティブTCPソケット**を使用します。

実装しているもの：

・Length-Prefix型メッセージフレーミング
・バッファリング + while復元処理
・切断検出と再接続処理
・Graceful shutdown
・重複接続防止

TCPレベルの挙動を理解することを目的とした設計です。

---

## 🧮 台帳モデル（Ledger Replay）

残高は保存されません。

各ノードは：

1. ジェネシスから全トランザクションをリプレイ
2. 動的に残高を再構築
3. ブロック受信時に再検証

これにより、ノード間の整合性が保証されます。

---

## 📦 Mempool管理

・署名検証
・残高検証
・重複防止
・ブロック確定時の自動整理

mempoolは単なるキューではなく、整合性チェックを行う検証レイヤーです。

---

## 🌐 ネットワークモード

### Dockerモード

開発・ローカル実験用。

### IPモード

実機ローカルネットワーク用。

`.env` にて `NETWORK_MODE` を指定。

---

# 🖥 ダッシュボード

リアルタイムWeb UI：

・チェーン可視化
・mempool監視
・残高表示
・トランザクション送信
・ノード状態表示

教育用途として、内部状態を透明化しています。

---

# 🧱 ブロック構造

各ブロックは以下を含みます：

・index
・previousHash
・timestamp
・hash
・signer（Master公開鍵）
・signature
・data.transactions[]

ブロック署名はPoAの中核です。

---

# 🔐 Secure Network（TLS構成）

Bouya-BouyaはTLS対応ネットワークをサポートしています。
小規模なCA（mini-PKI）を用いたノード証明書管理が可能です。

新規ノードをTLSネットワークに参加させる場合：

➡️ [Join the Bouya-Bouya TLS Network](JoinTLSNetwork.md)

---

# 🛠 インストール

必要パッケージ：

```bash
npm install express dotenv @noble/curves @noble/hashes crypto-js
```

ウォレット生成時のみ一時的に：

```bash
npm install elliptic
```

その後削除可能です。

---

# ⚙ 環境変数例（IPモード）

```ini
NETWORK_MODE=ip
MASTER_ID=node1
NODE_ID=node1

NODE1_PRIVATE_KEY=...
NODE1_PUBLIC_KEY=...
```

Followerの場合：

```ini
NETWORK_MODE=ip
MASTER_ID=node1
NODE_ID=node2

NODE1_PUBLIC_KEY=...
NODE2_PRIVATE_KEY=...
NODE2_PUBLIC_KEY=...
```

---

# 💸 トランザクションライフサイクル

1. Web UIから作成
2. 送信者秘密鍵で署名
3. `NEW_TX` としてP2P伝播
4. 各ノードでmempool検証
5. Masterがブロックに含める
6. `NEW_BLOCK` 伝播
7. 全ノードが検証・リプレイ

---

# 📚 教育用リポジトリ

TCPメッセージ分割問題についての補助教材：

## 🔗 TCP Message Framing

[https://github.com/tsurubaso/TCPmogi](https://github.com/tsurubaso/TCPmogi)

TCPでJSONが壊れる理由と、安全な復元方法を解説しています。

---

# 🎯 プロジェクトの目的

Bouya-Bouyaは以下を理解するための実験環境です：

・ブロックチェーン内部構造
・PoA設計
・低レベルP2P通信
・暗号実装
・同期アルゴリズム
・分散台帳整合性

単なる「暗号通貨ごっこ」ではなく、
**分散システムを手で構築するための学習基盤**です。

