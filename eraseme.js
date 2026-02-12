function tryDecryptMail(packet) {
  try {
    return decryptPayload(packet.payload);
  } catch {
    return null;
  }
}
