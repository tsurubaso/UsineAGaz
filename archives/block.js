import CryptoJS from 'crypto-js';




export class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;             // Position du bloc dans la chaîne
        this.timestamp = timestamp;     // Heure de création
        this.data = data;               // Les transactions (ex: qui donne à qui)
        this.previousHash = previousHash; // Le hash du bloc d'avant (le lien !)
        this.hash = this.calculateHash(); // L'empreinte de ce bloc
    }

    // Cette fonction mélange toutes les infos du bloc pour créer une signature unique
    calculateHash() {
        return CryptoJS.SHA256(
            this.index + 
            this.previousHash + 
            this.timestamp + 
            JSON.stringify(this.data)
        ).toString();
    }
}
