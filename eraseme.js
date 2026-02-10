function renderKnownNodes() {
  const addrs = getKnownAddresses();

  if (addrs.length === 0) {
    return "<p>Aucune adresse connue pour l’instant.</p>";
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return `
    <ul>
      ${addrs
        .map((addr, i) => {
          const label = `node${alphabet[i] || i}`;

          return `
            <li style="margin-bottom:10px;">
              <b>${label}</b><br>

              <code style="font-size:12px;">${addr}</code><br>

              <button 
                onclick="copyToClipboard('${addr}')"
                style="margin-top:4px; cursor:pointer;"
              >
                📋 Copier
              </button>

              <span id="msg-${i}" style="margin-left:6px; color:green;"></span>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}
