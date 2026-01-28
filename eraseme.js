const privateKeyHex = process.env.NODE1_PRIVATE_KEY;
const privateKey = hexToBytes(privateKeyHex);

const signature = secp256k1.sign(blockHashBytes, privateKey);
