import { Block } from './blockchain.js';

// 1. Création du "Génèse Bloc" (le tout premier, il n'a pas de parent)
const genesisBlock = new Block(0, Date.now(), "Bloc de Génèse", "0");
console.log("Bloc 1 créé :");
console.log(genesisBlock);

console.log("-----------------------");

// 2. Création du deuxième bloc (il prend le hash du premier)
const block2 = new Block(1, Date.now(), { montant: 50, from: "Alice", to: "Bob" }, genesisBlock.hash);
console.log("Bloc 2 créé (lié au Bloc 1) :");
console.log(block2);