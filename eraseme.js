blockchain.push(block);

// Mise à jour des soldes
for (const tx of block.data.transactions) {
  applyTransaction(tx, balances);
}

console.log(`[${nodeID}] ➕ Bloc ajouté`);
