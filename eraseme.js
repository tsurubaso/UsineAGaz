const WEB_PORT = process.env.WEB_PORT || 3000;

switch (NETWORK_MODE) {
  case "docker":
    app.listen(WEB_PORT, "0.0.0.0", () => {
      log(`>> 🌍 Dashboard Web (Docker) sur http://localhost:${WEB_PORT}`);
    });
    break;

  case "ip":
    app.listen(WEB_PORT, "0.0.0.0", () => {
      log(`>> 🌍 Dashboard Web (IP) sur http://<TON_IP>:${WEB_PORT}`);
    });
    break;

  default:
    app.listen(WEB_PORT, () => {
      log(`>> 🌍 Dashboard Web (local) sur http://localhost:${WEB_PORT}`);
    });
}
