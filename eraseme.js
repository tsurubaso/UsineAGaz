function gracefulShutdown() {
  log("🛑 Arrêt propre...");

  // fermer sockets
  for (const sock of sockets) {
    sock.end();
    sock.destroy();
  }

  saveChainToDisk();

  server.close(() => {
    log("✅ Serveur TCP fermé");
    process.exit(0);
  });
}
