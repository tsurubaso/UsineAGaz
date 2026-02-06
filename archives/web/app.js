async function refreshStatus() {
  const res = await fetch("/status");
  const data = await res.json();

  document.getElementById("title").innerText =
    "📡 Node " + data.nodeID;

  document.getElementById("balances").innerText =
    JSON.stringify(data.balances, null, 2);

  document.getElementById("logs").innerText =
    data.logs.join("\n");
}

async function sendTx() {
  const to = document.getElementById("txTo").value;
  const amount = parseInt(document.getElementById("txAmount").value);

  await fetch("/tx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, amount }),
  });

  refreshStatus();
}

setInterval(refreshStatus, 1000);
refreshStatus();
