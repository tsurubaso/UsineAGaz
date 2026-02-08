function applyTransaction(tx, balances) {
  if (isMintTransaction(tx)) {
    balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
    log(`>> [Balance] MINT de ${tx.amount} pour ${tx.to.slice(0,10)}...`);
    return;
  }

  balances[tx.from] = (balances[tx.from] || 0) - tx.amount;
  balances[tx.to] = (balances[tx.to] || 0) + tx.amount;
  log(`>> [Balance] Transfert: ${tx.from.slice(0,10)}... -> ${tx.to.slice(0,10)}... (${tx.amount})`);
}