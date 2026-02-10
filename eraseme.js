function renderKnownAddresses() {
  const addresses = getKnownAddresses();

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return `
    <div class="box">
      <h3>🌐 Interlocuteurs connus</h3>

      <ul>
        ${addresses
          .map((addr, i) => {
            const label = `node${alphabet[i] || i}`;

            return `
              <li>
                <b>${label}</b> : ${addr.slice(0, 16)}...
                <form method="POST" action="/tx" style="margin-top:4px;">
                  <input type="hidden" name="to" value="${addr}" />
                  <input type="number" name="amount" value="10" style="width:60px;" />
                  <button type="submit">Envoyer</button>
                </form>
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
}
