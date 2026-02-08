app.post("/tx", (req, res) => {
    const { to, amount } = req.body;
    
    // Validation simple pour éviter les crashs
    if (!to || !amount) {
        log("❌ Erreur: Destinataire ou montant manquant");
        return res.status(400).send("Champs manquants");
    }

    const tx = {
        from: publicKey,
        to: to.trim(),
        amount: parseInt(amount),
        timestamp: Date.now(),
    };

    // Important: L'ID doit être créé AVANT la signature ou inclus dans le hash
    tx.id = createTransactionId(tx);
    tx.signature = signTransaction(tx, privateKey);

    // Ajout local et propagation
    mempool.push(tx);
    log(`💸 TX créée localement -> ${tx.amount} vers ${tx.to.slice(0, 12)}...`);

    peers.forEach((peer) =>
        sendMessage(peer, {
            type: "NEW_TX",
            from: nodeID,
            tx,
        })
    );

    res.redirect("/");
});