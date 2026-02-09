if (nodeID === MASTER_ID) {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  if (fs.existsSync("./data/master_chain.json")) {
    blockchain = JSON.parse(fs.readFileSync("./data/master_chain.json"));
    log(">> 📂 Blockchain master rechargée depuis disque");

    // ✅ Soldes reconstruits
    recalculateBalances();

    // ✅ Master prêt
    isSyncing = false;
  } else {
    const genesis = createGenesisBlock();
    genesis.signature = signBlock(genesis, privateKey);
    genesis.signer = publicKey;

    blockchain.push(genesis);
    log(">> 🧱 Genesis créé");

    // ✅ Init balances
    recalculateBalances();
    isSyncing = false;
  }
}
