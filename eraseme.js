case "NEW_TX": {
  const tx = msg.tx;
  if (!tx) {
    log(">> ❌ ERREUR : Message NEW_TX reçu sans objet transaction");
    return;
  }
  
  // ... reste du code
  