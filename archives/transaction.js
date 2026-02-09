  // 2) Distribution immédiate
  const payNode2 = {
    from: publicKey,
    to: process.env.NODE2_PUBLIC_KEY,
    amount: 100,
    timestamp: Date.now(),
  };

  payNode2.signature = signTransaction(payNode2, privateKey);
  payNode2.id = createTransactionId(payNode2);

  mempool.push(payNode2);

  if (process.env.NODE3_PUBLIC_KEY) {
    const payNode3 = {
      from: publicKey,
      to: process.env.NODE3_PUBLIC_KEY,
      amount: 100,
      timestamp: Date.now(),
    };

    payNode3.signature = signTransaction(payNode3, privateKey);
    payNode3.id = createTransactionId(payNode3);

    mempool.push(payNode3);
  }  