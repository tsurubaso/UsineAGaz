function forgeBlock() {
  // ... (checks)
  
  if (!lastBlock) { // <--- 🚨 ERROR HERE
    log("❌ Aucun bloc Genesis présent → forge impossible");
    return;
  }
  const lastBlock = blockchain[blockchain.length - 1]; // This is defined AFTER the check