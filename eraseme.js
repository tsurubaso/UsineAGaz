case "GET_CHAIN":
  log(">> 📤 Envoi FULL_CHAIN au peer");

  socket.write(
    JSON.stringify({
      type: "FULL_CHAIN",
      from: nodeID,
      chain: blockchain,
    })
  );

  socket.end(); // ✅ IMPORTANT
  break;
