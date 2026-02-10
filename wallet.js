import elliptic from 'elliptic';
const ec = new elliptic.ec('secp256k1'); // La même courbe que Bitcoin !

export class Wallet {
    constructor() {
        // Génère une nouvelle paire de clés aléatoire
        const key = ec.genKeyPair();
        
        this.privateKey = key.getPrivate('hex');
        this.publicKey = key.getPublic('hex');
    }
}

// Petit test rapide
const monWallet = new Wallet();
console.log("Ma Clé Privée (À GARDER CACHÉE) :", monWallet.privateKey);
console.log("Mon Adresse Publique (À PARTAGER) :", monWallet.publicKey);