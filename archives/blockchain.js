import { Block } from "./block.js";

export class Blockchain {
  constructor() {
    // La chaîne commence avec le Genesis Block
    this.chain = [this.createGenesisBlock()];
    this.totalSupply = 1000; // Ton stock de départ
  }

  createGenesisBlock() {
    return new Block(
      0,
      Date.now(),
      {
        message: "Initial Mint",
        amount: 1000,
        to: "Admin_Wallet",
      },
      "0",
    );
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Ajouter un nouveau bloc après vérification
  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
  }

  // Vérifier si la chaîne n'a pas été piratée
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Le hash actuel est-il correct ?
      if (currentBlock.hash !== currentBlock.calculateHash()) return false;

      // Le lien avec le bloc précédent est-il rompu ?
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    // On parcourt toute la chaîne
    for (const block of this.chain) {
      const trans = block.data;

      // Si c'est le bloc de création (Mint)
      if (trans.action === "MINT" && trans.to === address) {
        balance += trans.amount;
      }

      // Si c'est une transaction classique
      if (trans.from === address) {
        balance -= trans.amount;
      }
      if (trans.to === address) {
        balance += trans.amount;
      }
    }
    return balance;
  }
}
