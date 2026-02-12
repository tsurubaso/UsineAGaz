let buffer = "";

socket.on("data", (chunk) => {
  buffer += chunk.toString();

  try {
    const msg = JSON.parse(buffer);
    buffer = "";
    handleMessage(msg, socket);
  } catch {
    // attendre plus de data
  }
});
