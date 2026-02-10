import { secp256k1 } from "@noble/curves/secp256k1";

function genKeyPair() {
  // 32 bytes random private key
  const priv = secp256k1.utils.randomPrivateKey();

  // Public key (compressed by default)
  const pub = secp256k1.getPublicKey(priv);

  console.log("PRIVATE_KEY =", Buffer.from(priv).toString("hex"));
  console.log("PUBLIC_KEY  =", Buffer.from(pub).toString("hex"));
  console.log("-----");
}

genKeyPair();
genKeyPair();
