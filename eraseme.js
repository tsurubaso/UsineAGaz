/*
════════════════════════════════════════
DASHBOARD WEB
Chaque node expose ses données sur :
http://localhost:300X
════════════════════════════════════════
*/

const webServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });

  res.end(`
    <html>
      <head>
        <title>${nodeID} Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: darkblue; }
          .box { padding: 10px; margin: 10px 0; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <h1>📡 Node ${nodeID}</h1>

        <div class="box">
          <h2>Blockchain</h2>
          <p>Nombre de blocs : ${blockchain.length}</p>
        </div>

        <div class="box">
          <h2>Mempool</h2>
          <p>Transactions en attente : ${mempool.length}</p>
        </div>

        <div class="box">
          <h2>Balances</h2>
          ${renderBalances()}
        </div>

      </body>
    </html>
  `);
});

webServer.listen(3000, () => {
  console.log(`[${nodeID}] 🌍 Dashboard web actif sur port 3000`);
});
