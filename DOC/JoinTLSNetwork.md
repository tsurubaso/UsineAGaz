
## 🌐 Join the Bouya-Bouya TLS Network (New Node Guide)

Bouya-Bouya uses a **mini-PKI** system to secure node-to-node communication with **TLS**.

That means:

* Every node has its own certificate + private key
* All certificates must be signed by the **master CA** (Node1)
* Nodes trust each other only through the shared CA certificate

This guide explains how a new node (Node2, Node3, Node4…) can join safely.

---

## ✅ What You Need to Join

Each node must have:

| File        | Description                                          |
| ----------- | ---------------------------------------------------- |
| `ca.crt`    | Public certificate of the network authority (shared) |
| `nodeX.key` | Private key (secret, never shared)                   |
| `nodeX.crt` | Signed certificate (public identity)                 |

---

## 🔥 Important Security Rule

A node must **never** share its private key:

❌ DO NOT send `nodeX.key` to anyone
✅ Only send the CSR (`nodeX.csr`)

---

## 🧩 Step-by-Step: New Node Joining

---

# 1️⃣ The New Node Generates Its Own Key

On Node3 (or any new node):

```bash
openssl genrsa -out node3.key 4096
```

This creates the node’s private key.

---

# 2️⃣ The New Node Creates a Certificate Request (CSR)

```bash
openssl req -new -key node3.key -out node3.csr
```

During the prompt, you can use something like:

* Common Name: `node3`

This CSR is like:

> “Hello CA, please sign me so I can join the network.”

---

# 3️⃣ The New Node Sends Only This File to Node1

Node3 must send:

```
node3.csr
```

To the master node (Node1).

---

# 4️⃣ Node1 Signs the New Node Certificate

On Node1 (the CA authority):

```bash
openssl x509 -req \
  -in node3.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out node3.crt \
  -days 365 \
  -sha256
```

Now Node3 becomes an official trusted peer.

---

# 5️⃣ Node1 Sends Back the Signed Certificate + CA Public Cert

Node1 sends to Node3:

```
node3.crt
ca.crt
```

---

# 6️⃣ Final Files Node3 Must Have

Node3 folder should contain:

```
ca.crt        # Trust anchor (public)
node3.crt     # Signed identity (public)
node3.key     # Private secret (never shared)
```

---

## ✅ Node3 Is Now Ready to Connect

Node3 can now start its blockchain node securely.

TLS will ensure:

* encrypted communication
* node authentication
* protection against fake peers

---

## 🔐 Trust Model Summary

| Node       | Keeps Secret | Shares                   |
| ---------- | ------------ | ------------------------ |
| Node1 (CA) | `ca.key`     | `ca.crt`                 |
| Node3      | `node3.key`  | `node3.csr`, `node3.crt` |

---

## 🚀 Next Improvements (Coming Soon)

* Automatic peer discovery over TLS
* Certificate revocation (ban a node)
* Mutual authentication enforcement
* Production-ready secure handshake

---

If you want, next step is **integrating this into the Node.js TCP code** with `tls.createServer()` and `tls.connect()` 🔥
