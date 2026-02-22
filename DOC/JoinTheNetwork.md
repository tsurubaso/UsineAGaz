

# 🔐 TLS 証明書の作成方法（SAN 対応版）

## 概要

Bouya-Bouya は以下の TLS 設計になっています：

* 相互 TLS（mTLS）
* CA 署名必須
* `rejectUnauthorized: true`
* SAN（Subject Alternative Name）必須
* CN のみの証明書は不可

⚠ 現代の TLS（1.2 / 1.3）では **SAN が無い証明書は拒否されます**。
Common Name（CN）は検証対象になりません。

---

## ディレクトリ構成

```
certs/
 ├── ca.key
 ├── ca.crt
 ├── node1.key
 ├── node1.crt
 ├── node2.key
 ├── node2.crt
```

---

# ① CA の作成（初回のみ）

```bash
openssl genrsa -out ca.key 4096

openssl req -x509 -new -nodes \
  -key ca.key \
  -sha256 \
  -days 3650 \
  -out ca.crt \
  -subj "/CN=Bouya-CA"
```

---

# ② Node 鍵の生成

例：node1

```bash
openssl genrsa -out node1.key 2048
```

---

# ③ SAN 用 openssl 設定ファイル作成

`openssl-node1.cnf` を作成：

```ini
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
CN = node1

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = node1
IP.1  = 192.168.0.157
```

⚠ IP は実際のノードIPに変更してください。
Docker モードの場合は DNS のみで可：

```
DNS.1 = node1
```

---

# ④ CSR 作成（SAN 含む）

```bash
openssl req -new \
  -key node1.key \
  -out node1.csr \
  -config openssl-node1.cnf
```

---

# ⑤ CA で署名（SAN を引き継ぐ）

```bash
openssl x509 -req \
  -in node1.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out node1.crt \
  -days 365 \
  -sha256 \
  -extensions req_ext \
  -extfile openssl-node1.cnf
```

---

# ⑥ SAN が入っているか確認（必須）

```bash
openssl x509 -in node1.crt -text -noout
```

確認ポイント：

```
X509v3 Subject Alternative Name:
    DNS:node1, IP Address:192.168.0.157
```

これが無い場合、TLS handshake は必ず失敗します。

---

# なぜ SAN が必須なのか

現代の TLS 実装では：

* CN は検証対象外
* SAN のみがホスト検証に使用される
* SAN が無い証明書は即 reject

Node.js + OpenSSL ではこの失敗は：

```
ssl/tls alert handshake failure
```

としか表示されません。

---

# Node.js 側の前提設定

Bouya-Bouya の TLS 設定：

サーバー：

```js
tls.createServer({
  key: fs.readFileSync("./certs/node1.key"),
  cert: fs.readFileSync("./certs/node1.crt"),
  ca: fs.readFileSync("./certs/ca.crt"),
  requestCert: true,
  rejectUnauthorized: true
})
```

クライアント：

```js
tls.connect({
  host,
  port,
  key: fs.readFileSync("./certs/node1.key"),
  cert: fs.readFileSync("./certs/node1.crt"),
  ca: fs.readFileSync("./certs/ca.crt"),
  rejectUnauthorized: true
})
```

---

# よくある失敗

### ① SAN が無い

→ 100% handshake failure

### ② key と cert がペアでない

→ bad certificate

### ③ CA が一致していない

→ unknown ca

### ④ IP と SAN が一致していない

→ hostname verification failure

---

# Docker モードの場合

Docker 内通信では通常 IP は不要：

```
DNS.1 = node1
DNS.2 = node2
```

コンテナ名がホスト名になります。

---

# セキュリティ前提

現在の設計では：

* すべてのノードは CA によって管理される
* 任意ノード参加不可
* Proof of Authority 前提
* TLS はノード認証レイヤー

---

# 結論

TLS handshake failure が出る場合、
ほぼ確実に：

* SAN 不備
* CA 不一致
* 証明書ペア不一致

コードではありません。

証明書が正しければ、Bouya-Bouya TLS ネットワークは正常に動作します。


