function gracefulShutdown() {
  log("🛑 Arrêt propre...");

  // stop timeouts
  clearTimeout(syncTimeout);
  clearTimeout(bootstrapTimeout);

  // stop loops
  clearInterval(forgeInterval);
  clearInterval(followerInterval);

  log("⏹️ Toutes les boucles stoppées");

  // close server
  server.close(() => {
    log("✅ Serveur TCP fermé");

    process.exit(0);
  });
}
