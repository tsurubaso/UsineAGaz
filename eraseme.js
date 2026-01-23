// Importation de la classe Block depuis le fichier voisin
import { Block } from './block.js'; 

export class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock() {
        // Ici, on utilise la classe Block importée
        return new Block(0, Date.now(), { message: "Initial Mint", amount: 1000 }, "0");
    }

    // ... le reste de ton code (addBlock, isChainValid, etc.)
}