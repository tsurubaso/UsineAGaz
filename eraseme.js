function forgeBlock() {
  if (nodeID !== "node1") return;

  if (mempool.length === 0) {
    console.log(`[${nodeID}] ⏸️ Mempool vide, rien à forger`);
    return;
  }

  const lastBlock = blockchain[blockchain.length - 1];

  const transactions = [...mempool];

  const block = {
    index: lastBlock.index + 1,
    previousHash: lastBlock.hash,
    timestamp: Date.now(),
    data: { transactions },
  };

  block.hash = calculateHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data
  );

  block.signature = signBlock(block, privateKey);
  block.signer = publicKey;

  // Ajout du bloc à la chaîne
  blockchain.push(block);

  // Application aux soldes
  for (const tx of transactions) {
    applyTransaction(tx, balances);
  }

  // Nettoyage du mempool : retirer les tx confirmées
  const confirmedIds = new Set(transactions.map((tx) => tx.id));
  mempool = mempool.filter((tx) => !confirmedIds.has(tx.id));

  console.log(`[${nodeID}] ⛏️ Bloc forgé (#${block.index})`);

  // Diffusion aux peers
  peers.forEach((peer) =>
    sendMessage(peer, {
      type: "NEW_BLOCK",
      from: nodeID,
      block,
    })
  );
}
